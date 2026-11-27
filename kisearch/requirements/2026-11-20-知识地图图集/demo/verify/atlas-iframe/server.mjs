/**
 * 验证目的（REQ-20261120-003 v4）：
 *   模拟 kisearch 侧最小可用的 /api/atlas/* 接口，验证「整包部署 + iframe 加载」是否真的成立。
 *   只验证风险点，不是生产实现：无并发控制、无分片续传、无 wal、无审计。
 *
 * 覆盖风险：
 *   R-01 iframe 能否加载鉴权接口返回的自包含 HTML 并正常运行
 *   R-02 base64 分片上传 / 原子替换 / archive / 坏包拒绝
 *   R-03 大包加载耗时（由前端与 probe 计时）
 *   R-05 只能靠 Cookie 会话鉴权
 */
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const STORE = path.join(ROOT, 'store');
const PUBLIC = path.join(ROOT, 'public');
const PKG = path.join(ROOT, 'packages');
const PORT = Number(process.env.PORT || 8910);
const MAX_BYTES = 20 * 1024 * 1024;

// 模拟权限模型：谁登录 → 能看/能写哪些 scope
const USERS = {
  admin: { write: ['kisearch', 'default'], read: ['kisearch', 'default', 'empty-kb', 'readonly-kb'] },
  viewer: { write: [], read: ['kisearch', 'default', 'empty-kb', 'readonly-kb'] },
};
const READONLY = new Set(['readonly-kb']); // 只读库：拒绝写

const atlasDir = (scope) => path.join(STORE, scope, '.atlas');

function send(res, code, body, headers = {}) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  res.writeHead(code, { 'Content-Length': buf.length, ...headers });
  res.end(buf);
}
const json = (res, code, obj) => send(res, code, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8' });

function readBody(req, limit = MAX_BYTES * 1.5) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('BODY_TOO_LARGE')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function session(req) {
  const raw = req.headers.cookie || '';
  const m = raw.match(/ki_session=([^;]+)/);
  return m ? USERS[m[1]] || null : null;
}

/** 包自包含校验：需求 §3.2 的四条硬约定 */
function validatePackage(buf) {
  const head = buf.subarray(0, 2048).toString('utf8');
  if (!/<!DOCTYPE html/i.test(head)) return '不是合法 HTML（缺 <!DOCTYPE html>）';
  const text = buf.toString('utf8');
  if (!/"baked"\s*:\s*true/.test(text)) return '缺少 baked:true 标记（未烘焙，运行时会去找 atlas.config.json）';
  const ext = text.match(/(?:src|href)\s*=\s*"(https?:\/\/[^"]+)"|url\((https?:\/\/[^)]+)\)/i);
  if (ext) return `含外链资源：${(ext[1] || ext[2]).slice(0, 80)}`;
  if (buf.length > MAX_BYTES) return `超过体积上限 ${MAX_BYTES} 字节`;
  return null;
}

function readMeta(scope) {
  const f = path.join(atlasDir(scope), 'meta.json');
  if (!fs.existsSync(f)) return null;
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const p = url.pathname;

  // 静态壳
  if (p === '/' || p === '/atlas') {
    return send(res, 200, fs.readFileSync(path.join(PUBLIC, 'index.html')), { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
  }
  if (p.startsWith('/public/')) {
    const f = path.join(PUBLIC, path.basename(p));
    if (!fs.existsSync(f)) return send(res, 404, 'not found');
    return send(res, 200, fs.readFileSync(f), { 'Content-Type': 'text/css; charset=utf-8' });
  }

  if (p === '/api/login' && req.method === 'POST') {
    const body = JSON.parse((await readBody(req)) || '{}');
    if (!USERS[body.user]) return json(res, 400, { ok: false, error: 'unknown user' });
    res.setHeader('Set-Cookie', `ki_session=${body.user}; Path=/; HttpOnly; SameSite=Lax`);
    return json(res, 200, { ok: true, user: body.user });
  }

  // ── 以下全部需要登录（模拟 kisearch 的 /api/* 鉴权）──
  const me = session(req);
  if (!me) return json(res, 401, { ok: false, code: 'UNAUTHENTICATED', error: '未登录或会话过期' });

  const scope = url.searchParams.get('scope') || 'kisearch';
  const canRead = me.read.includes(scope);
  const canWrite = me.write.includes(scope) && !READONLY.has(scope);

  if (p === '/api/atlas/status') {
    if (!canRead) return json(res, 403, { ok: false, code: 'SCOPE_FORBIDDEN' });
    const meta = readMeta(scope);
    return json(res, 200, meta ? { ok: true, exists: true, ...meta } : { ok: true, exists: false });
  }

  if (p === '/api/atlas/view' && req.method === 'GET') {
    if (!canRead) return json(res, 403, { ok: false, code: 'SCOPE_FORBIDDEN' });
    const f = path.join(atlasDir(scope), 'atlas.html');
    if (!fs.existsSync(f)) return json(res, 404, { ok: false, code: 'ATLAS_NOT_FOUND', error: `${scope} 还没有上传图集` });
    const buf = fs.readFileSync(f);
    if (buf.length === 0) return json(res, 500, { ok: false, code: 'ATLAS_CORRUPTED' });
    return send(res, 200, buf, {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Frame-Options': 'SAMEORIGIN',
      'Content-Security-Policy': "frame-ancestors 'self'",
      'Cache-Control': 'no-cache',
    });
  }

  if (p === '/api/atlas/package' && req.method === 'POST') {
    // 写接口的 scope 以 body 为准（与 /api/import/upload 的 body.scope 同口径），
    // 因此权限校验必须放在读 body 之后——原型第一版从 query 取 scope，导致越权校验失效。
    let body;
    try { body = JSON.parse(await readBody(req)); } catch (e) {
      return json(res, e.message === 'BODY_TOO_LARGE' ? 413 : 400, { ok: false, code: 'BAD_BODY' });
    }
    const wScope = (body?.scope && String(body.scope).trim()) || scope;
    const wReadonly = READONLY.has(wScope);
    if (!me.write.includes(wScope) || wReadonly) {
      return json(res, 403, { ok: false, code: wReadonly ? 'SCOPE_READONLY' : 'SCOPE_FORBIDDEN' });
    }
    const { meta = {}, files = [], batchIndex = 0, batchCount = 1, uploadId = 'u1' } = body;
    if (!Array.isArray(files) || files.length === 0) return json(res, 400, { ok: false, code: 'NO_FILES' });

    const partDir = path.join(STORE, wScope, '.upload', uploadId);
    fs.mkdirSync(partDir, { recursive: true });
    for (const f of files) {
      fs.writeFileSync(path.join(partDir, path.basename(f.name || 'part')), Buffer.from(f.content || '', 'base64'));
    }
    // 收到最后一片才落盘：分片中断不会产生半成品
    if (batchIndex + 1 < batchCount) return json(res, 202, { ok: true, received: batchIndex + 1, of: batchCount });

    const parts = fs.readdirSync(partDir).sort();
    const buf = Buffer.concat(parts.map((n) => fs.readFileSync(path.join(partDir, n))));
    const err = validatePackage(buf);
    if (err) { fs.rmSync(partDir, { recursive: true, force: true }); return json(res, 400, { ok: false, code: 'PACKAGE_INVALID', error: err }); }

    const dir = atlasDir(wScope);
    const target = path.join(dir, 'atlas.html');
    fs.mkdirSync(path.join(dir, 'archive'), { recursive: true });
    if (fs.existsSync(target)) {
      fs.copyFileSync(target, path.join(dir, 'archive', `atlas-${Date.now()}.html`));
    }
    const tmp = path.join(dir, `.atlas-${Date.now()}.tmp`);
    fs.writeFileSync(tmp, buf);
    fs.renameSync(tmp, target); // 原子替换
    fs.rmSync(partDir, { recursive: true, force: true });

    const m = { ...meta, size: buf.length, sha256: createHash('sha256').update(buf).digest('hex'), uploadedAt: new Date().toISOString() };
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(m, null, 2));
    return json(res, 200, { ok: true, ...m });
  }

  if (p === '/api/atlas/package' && req.method === 'DELETE') {
    if (!canWrite) return json(res, 403, { ok: false, code: 'SCOPE_FORBIDDEN' });
    const dir = atlasDir(scope);
    fs.rmSync(path.join(dir, 'atlas.html'), { force: true });
    fs.rmSync(path.join(dir, 'meta.json'), { force: true });
    return json(res, 200, { ok: true, removed: true });
  }

  return json(res, 404, { ok: false, code: 'NOT_FOUND', path: p });
});

server.listen(PORT, '127.0.0.1', () => console.log(`demo-verify server on http://127.0.0.1:${PORT}/atlas`));
