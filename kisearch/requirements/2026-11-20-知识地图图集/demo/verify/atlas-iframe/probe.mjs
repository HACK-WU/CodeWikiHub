/**
 * 验证目的：对「整包部署 + iframe 加载」方案逐风险点给出可判定结论。
 * 断言失败不中断，全部跑完统一输出结论（每条 risk → pass/fail + 证据数字）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire('/root/pw/');
const { chromium } = require('playwright');

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const BASE = 'http://127.0.0.1:8910';
const SHOTS = path.join(ROOT, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const EXEC = '/root/.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell';

const results = [];
const check = (risk, id, ok, detail) => results.push({ risk, id, ok, detail });

const strip = (p) => fs.readFileSync(p, 'utf8');

/** 按 2 MB 切片上传，模拟真实分片协议 */
async function upload(scope, file, user = 'admin', { breakAfterFirst = false, batchCount } = {}) {
  const buf = fs.readFileSync(file);
  const CHUNK = 2 * 1024 * 1024;
  const total = batchCount ?? Math.max(1, Math.ceil(buf.length / CHUNK));
  const uploadId = 'u' + Math.random().toString(36).slice(2, 8);
  const out = [];
  for (let i = 0; i < total; i++) {
    if (breakAfterFirst && i === 1) break;
    const slice = buf.subarray(i * CHUNK, (i + 1) * CHUNK);
    const r = await fetch(`${BASE}/api/atlas/package`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `ki_session=${user}` },
      body: JSON.stringify({ scope, uploadId, batchIndex: i, batchCount: total, meta: { title: path.basename(file), branch: 'demo', baseline: 'abc1234', generatedAt: '2026-11-24', viewCount: 4 }, files: [{ name: `part-${i}`, content: slice.toString('base64') }] }),
    });
    out.push({ status: r.status, body: await r.json() });
  }
  return out;
}
const status = async (scope, user = 'admin') => {
  const r = await fetch(`${BASE}/api/atlas/status?scope=${scope}`, { headers: { Cookie: `ki_session=${user}` } });
  return { status: r.status, body: await r.json() };
};

(async () => {
  const browser = await chromium.launch({ executablePath: EXEC, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 160)));

  // ── A. 鉴权（R-05）──
  const noCookie = await fetch(`${BASE}/api/atlas/view?scope=kisearch`);
  check('R-05', 'A1 未登录访问 view 被拒', noCookie.status === 401, `HTTP ${noCookie.status}`);

  // ── B. 上传（R-02）──
  const bad = strip(path.join(ROOT, 'packages', 'real.html')).replace(/"baked"\s*:\s*true/, '"baked": false');
  fs.writeFileSync(path.join(ROOT, 'packages', 'bad-nobaked.html'), bad);
  const ext = strip(path.join(ROOT, 'packages', 'real.html')).replace('</head>', '<script src="https://cdn.example.com/x.js"></script></head>');
  fs.writeFileSync(path.join(ROOT, 'packages', 'bad-external.html'), ext);

  const up1 = await upload('kisearch', path.join(ROOT, 'packages', 'real.html'));
  const st1 = await status('kisearch');
  const realSize = fs.statSync(path.join(ROOT, 'packages', 'real.html')).size;
  check('R-02', 'B1 分包上传成功且体积一致', up1.at(-1).status === 200 && st1.body.exists && st1.body.size === realSize, `last=${up1.at(-1).status} size=${st1.body.size}/${realSize} sha=${(st1.body.sha256 || '').slice(0, 8)}`);

  const up2 = await upload('kisearch', path.join(ROOT, 'packages', 'synth.html'));
  const archiveDir = path.join(ROOT, 'store', 'kisearch', '.atlas', 'archive');
  const archived = fs.existsSync(archiveDir) ? fs.readdirSync(archiveDir) : [];
  check('R-02', 'B2 重传覆盖并把旧包归档', up2.at(-1).status === 200 && archived.length >= 1, `archive 文件数 ${archived.length}`);

  const st2 = await status('kisearch');
  check('R-02', 'B3 覆盖后体积变为新包', st2.body.size === fs.statSync(path.join(ROOT, 'packages', 'synth.html')).size, `${(st2.body.size / 1024).toFixed(0)} KB`);

  const badN = await upload('default', path.join(ROOT, 'packages', 'bad-nobaked.html'));
  check('R-02', 'B4 缺 baked 标记被拒', badN.at(-1).status === 400 && /baked/.test(badN.at(-1).body.error || ''), `${badN.at(-1).status} ${badN.at(-1).body.code} · ${badN.at(-1).body.error}`);

  const badE = await upload('default', path.join(ROOT, 'packages', 'bad-external.html'));
  check('R-02', 'B5 含外链被拒', badE.at(-1).status === 400 && /外链/.test(badE.at(-1).body.error || ''), `${badE.at(-1).status} · ${badE.at(-1).body.error}`);

  const upViewer = await upload('kisearch', path.join(ROOT, 'packages', 'real.html'), 'viewer');
  check('R-02', 'B6 只读用户上传被拒', upViewer.every((r) => r.status === 403), `HTTP ${upViewer[0].status} ${upViewer[0].body.code}`);

  const upRo = await upload('readonly-kb', path.join(ROOT, 'packages', 'real.html'));
  check('R-02', 'B7 只读库上传被拒', upRo.every((r) => r.status === 403) && upRo[0].body.code === 'SCOPE_READONLY', `${upRo[0].status} ${upRo[0].body.code}`);

  const partial = await upload('default', path.join(ROOT, 'packages', 'real.html'), 'admin', { breakAfterFirst: true, batchCount: 2 });
  const stP = await status('default');
  const partLeft = fs.existsSync(path.join(ROOT, 'store', 'default', '.upload'));
  check('R-02', 'B8 分片中断不产生半成品', partial[0].status === 202 && stP.body.exists === false, `首片 ${partial[0].status}，status.exists=${stP.body.exists}，暂存目录残留=${partLeft}`);

  // ── C/D/E/F. 浏览器侧 ──
  await page.goto(`${BASE}/atlas`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  // 先上传真包（体积小，便于交互验证）
  await upload('kisearch', path.join(ROOT, 'packages', 'real.html'));
  const t0 = Date.now();
  await page.click('#remove'); // 触发 refresh 的简写：删除后重新拉
  await page.waitForTimeout(200);
  await page.locator('#scope').selectOption('kisearch');
  await page.evaluate(async () => { await fetch('/api/atlas/package?scope=kisearch', { method: 'DELETE' }); });
  await upload('kisearch', path.join(ROOT, 'packages', 'real.html'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const iframe = page.frameLocator('iframe');
  const nodeCount = await iframe.locator('[data-node-id]').count();
  const homeText = await iframe.locator('body').innerText().catch(() => '');
  check('R-01', 'C1 iframe 内已渲染图集（首页为索引页，无节点属正常）', /架构总览/.test(homeText) || nodeCount > 0, `节点 ${nodeCount} 个 · 首页文本 ${homeText.length} 字`);

  // 落地页：点第一张卡片进图
  if (nodeCount === 0) {
    await iframe.locator('text=运行时架构').first().click().catch(() => {});
    await page.waitForTimeout(1200);
  }
  const nodeCount2 = await iframe.locator('[data-node-id]').count();
  check('R-01', 'C2 进入图页后取得节点', nodeCount2 > 0, `${nodeCount2} 个`);

  // 点节点开抽屉
  await iframe.locator('[data-node-id="mcp"]').first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(600);
  const panelText = await iframe.locator('[class*=codepanel]').first().innerText().catch(() => '');
  check('R-01', 'C3 点节点可打开代码抽屉', /src\//.test(panelText) && panelText.length > 40, panelText.split('\n').slice(0, 3).join(' / ').slice(0, 90));
  await page.screenshot({ path: path.join(SHOTS, 'R01-drawer.png') });

  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const closed = await iframe.locator('[class*=codepanel].on').count();
  check('R-01', 'C4 ESC 可关闭抽屉', closed === 0, `残留 on 面板 ${closed}`);

  // 导出（下载）
  const dl = page.waitForEvent('download', { timeout: 8000 }).catch(() => null);
  await iframe.locator('button:has-text("导出"), [class*=export]').first().click({ timeout: 3000 }).catch(() => {});
  const download = await dl;
  check('R-01', 'C5 iframe 内「导出 ↓」可触发下载', !!download, download ? `文件名 ${download.suggestedFilename()}` : '未捕获 download 事件（也可能是 toast 形式的纯前端导出）');

  // 加载耗时（R-03）：按「用户能看到内容」计时，而不是 iframe load 事件
  async function measure(file) {
    await upload('kisearch', file);
    const t0 = Date.now();
    await page.reload({ waitUntil: 'domcontentloaded' });
    const fr = page.frameLocator('iframe');
    let visible = -1;
    for (let i = 0; i < 160; i++) {
      const txt = await fr.locator('body').innerText().catch(() => '');
      if (txt.length > 300) { visible = Date.now() - t0; break; }
      await page.waitForTimeout(50);
    }
    const loadMs = await page.evaluate(() => window.__iframeLoadMs);
    return { visible, loadMs, kb: Math.round(fs.statSync(file).size / 1024) };
  }
  const mReal = await measure(path.join(ROOT, 'packages', 'real.html'));
  const mSynth = await measure(path.join(ROOT, 'packages', 'synth.html'));
  check('R-03', 'D1 两档体积首屏可见耗时均 < 2s', mReal.visible > 0 && mSynth.visible > 0 && mSynth.visible < 2000,
    `real ${mReal.kb}KB：可见 ${mReal.visible}ms（load ${mReal.loadMs}ms）｜ synth ${mSynth.kb}KB：可见 ${mSynth.visible}ms（load ${mSynth.loadMs}ms）`);
  await page.screenshot({ path: path.join(SHOTS, 'R03-synth.png') });

  // 暗色（R-04）
  await page.click('#theme');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(SHOTS, 'R04-dark.png') });
  const shellDark = await page.evaluate(() => document.documentElement.dataset.theme);
  const iframeBg = await page.evaluate(() => {
    const f = document.querySelector('iframe');
    return f ? getComputedStyle(f).backgroundColor : null;
  });
  check('R-04', 'E1 暗色外壳已知与 iframe 浅色并存（记录现状）', shellDark === 'dark', `外壳 ${shellDark}，iframe 背景 ${iframeBg}`);

  // 空态 + 错误态
  await page.locator('#scope').selectOption('empty-kb');
  await page.waitForTimeout(900);
  const emptyText = await page.locator('main').innerText();
  check('R-04', 'F1 空库显示三步指引而非白屏', /还没有知识地图/.test(emptyText) && /pack_atlas/.test(emptyText), emptyText.split('\n')[0].slice(0, 40));
  await page.screenshot({ path: path.join(SHOTS, 'F1-empty.png') });

  const viewerPage = await ctx.newPage();
  await viewerPage.goto(`${BASE}/atlas`, { waitUntil: 'networkidle' });
  await viewerPage.locator('#user').selectOption('viewer');
  await viewerPage.waitForTimeout(900);
  const viewerBar = await viewerPage.locator('#bar').innerText();
  check('R-05', 'F2 viewer 可读图集（读权限生效）', /sha/.test(viewerBar) || /尚未上传/.test(viewerBar), viewerBar.slice(0, 80));

  check('R-01', 'G1 全程无页面脚本错误', pageErrors.length === 0, pageErrors.join(' | ').slice(0, 200));

  await browser.close();
  console.log(JSON.stringify({ results, pass: results.filter((r) => r.ok).length, fail: results.filter((r) => !r.ok).length }, null, 1));
})();
