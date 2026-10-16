# 表 → 模块（反向索引）

> 用途：改/删某张表前，先看哪些模块引用了它（穷举反查，机械提取）。
> 接口级影响面（精确到某个 handler）见各模块的 `.module-experts/` 资产或现场 grep。

| 表 | 模块数 | 模块（引用次数 · 来源） |
|----|--------|--------------------------|
| `user` | 25 | `auth`（8 · @InjectRepository）、`account-binding`（7 · @Module imports forFeature）、`xpert-project`（6 · @Module imports forFeature）、`mcp-publication`（5 · @Module imports forFeature）、`xpert-project-access`（5 · @InjectRepository）、`tenant-admin-cli`（4 · getRepository）、`user`（4 · @Module imports forFeature）、`agent-invocation`（4 · @Module imports forFeature）、`model-access`（4 · @Module imports forFeature）、`health`（3 · @Module imports forFeature）、`role`（3 · @Module imports forFeature）、`user-group`（3 · @Module imports forFeature）、`user-organization`（3 · @Module imports forFeature）、`copilot-usage`（3 · @Module imports forFeature）、`membership`（3 · @Module imports forFeature）、`model-gateway`（3 · @Module imports forFeature）、`xpert-marketplace`（3 · @Module imports forFeature）、`xpert-task`（3 · @Module imports forFeature）、`xpert-workspace`（3 · @Module imports forFeature）、`email`（2 · getRepository）、`factory-reset`（2 · @InjectRepository）、`chat-group`（2 · getRepository）、`tenant`（1 · getRepository）、`chat-conversation`（1 · getRepository）、`handoff-queue`（1 · getRepository） |
| `chat_conversation` | 15 | `chat-conversation`（31 · @Module imports forFeature）、`chat-group`（29 · getRepository）、`xpert`（12 · @Module imports forFeature）、`enterprise-chatkit`（9 · @InjectRepository）、`xpert-project`（9 · @Module imports forFeature）、`xpert-project-access`（8 · @InjectRepository）、`sandbox`（7 · @Module imports forFeature）、`ai`（6 · @Module imports forFeature）、`xpert-task`（6 · @Module imports forFeature）、`conversation-branch`（4 · getRepository）、`handoff-queue`（4 · getRepository）、`file-memory`（3 · @Module imports forFeature）、`model-execution`（3 · @Module imports forFeature）、`server-ai`（2 · @InjectRepository）、`agent-invocation`（1 · getRepository） |
| `chat_message` | 14 | `chat-group`（30 · getRepository）、`chat-conversation`（8 · @Module imports forFeature）、`ai`（7 · @Module imports forFeature）、`xpert-agent`（7 · @Module imports forFeature）、`server-ai`（5 · getRepository）、`chat-message`（3 · @Module imports forFeature）、`file-memory`（3 · @Module imports forFeature）、`xpert`（3 · @Module imports forFeature）、`conversation-branch`（2 · getRepository）、`conversation-map`（2 · Repository<T>）、`enterprise-chatkit`（2 · @InjectRepository）、`assistant-binding`（1 · getRepository）、`xpert-project-access`（1 · getRepository）、`xpert-project`（1 · getRepository） |
| `xpert` | 13 | `xpert`（23 · @Module imports forFeature）、`enterprise-chatkit`（22 · @InjectRepository）、`assistant-binding`（6 · @Module imports forFeature）、`membership`（4 · @Module imports forFeature）、`prompt-workflow`（4 · @Module imports forFeature）、`file-memory`（3 · @Module imports forFeature）、`plugin-resource`（3 · @Module imports forFeature）、`xpert-marketplace`（3 · @Module imports forFeature）、`xpert-project-access`（3 · @Module imports forFeature）、`chat-group`（2 · getRepository）、`knowledgebase`（2 · getRepository）、`xpert-project`（2 · @InjectRepository）、`xpert-agent`（1 · getRepository） |
| `user_organization` | 13 | `user-organization`（8 · @Module imports forFeature）、`auth`（6 · @Module imports forFeature）、`membership`（6 · @Module imports forFeature）、`xpert-project`（5 · @Module imports forFeature）、`agent-invocation`（4 · @Module imports forFeature）、`xpert-project-access`（4 · @InjectRepository）、`user-group`（3 · @Module imports forFeature）、`xpert-workspace`（3 · @Module imports forFeature）、`validator`（2 · @InjectRepository）、`factory-reset`（2 · @InjectRepository）、`chat-group`（2 · getRepository）、`organization`（1 · @Module imports forFeature）、`handoff-queue`（1 · getRepository） |
| `organization` | 12 | `organization`（6 · @Module imports forFeature）、`auth`（5 · @Module imports forFeature）、`invite`（4 · @InjectRepository）、`model-access`（4 · @Module imports forFeature）、`email`（3 · @Module imports forFeature）、`user-group`（3 · @Module imports forFeature）、`user-organization`（3 · @Module imports forFeature）、`membership`（3 · @Module imports forFeature）、`xpert-project`（3 · @Module imports forFeature）、`factory-reset`（2 · @InjectRepository）、`xpert-project-access`（2 · @InjectRepository）、`xpert-task`（1 · getRepository） |
| `xpert_agent_execution` | 11 | `handoff-queue`（14 · getRepository）、`chat-group`（9 · getRepository）、`agent-invocation`（7 · @Module imports forFeature）、`server-ai`（6 · @InjectRepository）、`ai`（6 · @Module imports forFeature）、`model-execution`（5 · @Module imports forFeature）、`xpert-agent-execution`（5 · @Module imports forFeature）、`chat-conversation`（3 · getRepository）、`xpert-project`（3 · @Module imports forFeature）、`xpert-project-access`（2 · @InjectRepository）、`assistant-binding`（1 · getRepository） |
| `chat_conversation_thread` | 10 | `handoff-queue`（15 · getRepository）、`chat-conversation`（14 · @Module imports forFeature）、`chat-group`（9 · getRepository）、`agent-invocation`（3 · getRepository）、`ai`（3 · @Module imports forFeature）、`desktop-shell`（3 · @Module imports forFeature）、`sandbox`（3 · @Module imports forFeature）、`conversation-branch`（1 · getRepository）、`xpert-project-access`（1 · getRepository）、`xpert-project`（1 · getRepository） |
| `feature_organization` | 9 | `feature`（5 · @Module imports forFeature）、`referral`（4 · @Module imports forFeature）、`membership`（4 · @Module imports forFeature）、`model-access`（4 · @Module imports forFeature）、`user`（3 · @Module imports forFeature）、`xpert-project`（3 · @Module imports forFeature）、`tenant-admin-cli`（2 · @InjectRepository）、`auth`（2 · @InjectRepository）、`xpert-project-access`（2 · @InjectRepository） |
| `role` | 9 | `invite`（6 · getRepository）、`tenant-admin-cli`（3 · @Module imports forFeature）、`role`（3 · @Module imports forFeature）、`validator`（2 · @InjectRepository）、`tenant`（2 · @InjectRepository）、`auth`（1 · getRepository）、`seeder`（1 · getRepository）、`role-permission`（1 · getRepository）、`shared`（1 · getRepository） |
| `knowledgebase` | 7 | `knowledgebase`（19 · @Module imports forFeature）、`knowledge-wiki`（19 · @Module imports forFeature）、`graphrag`（9 · @Module imports forFeature）、`plugin-resource`（3 · @Module imports forFeature）、`knowledge-processing-lifecycle`（1 · getRepository）、`knowledge-document`（1 · getRepository）、`knowledge-identity`（1 · getRepository） |
| `agent_invocation` | 6 | `agent-invocation`（17 · @Module imports forFeature）、`xpert-project-access`（11 · getRepository）、`xpert-project`（11 · getRepository）、`handoff-queue`（5 · getRepository）、`chat-group`（3 · getRepository）、`model-execution`（3 · @Module imports forFeature） |
| `knowledge_document` | 6 | `knowledge-document`（11 · @Module imports forFeature）、`knowledge-processing-lifecycle`（10 · @InjectRepository）、`knowledge-wiki`（10 · @Module imports forFeature）、`graphrag`（7 · getRepository）、`knowledgebase`（7 · getRepository）、`knowledge-identity`（1 · getRepository） |
| `tenant_setting` | 6 | `model-execution`（6 · @Module imports forFeature）、`membership`（5 · @Module imports forFeature）、`model-gateway`（5 · @Module imports forFeature）、`agent-plugin`（4 · getRepository）、`tenant-setting`（3 · @Module imports forFeature）、`plugin`（2 · getRepository） |
| `agent_runtime_inbox` | 5 | `handoff-queue`（42 · getRepository）、`agent-invocation`（11 · @Module imports forFeature）、`chat-group`（3 · getRepository）、`xpert-project-access`（1 · getRepository）、`xpert-project`（1 · getRepository） |
| `xpert_toolset` | 5 | `plugin-resource`（11 · @Module imports forFeature）、`xpert-toolset`（7 · @Module imports forFeature）、`server-ai`（4 · @InjectRepository）、`mcp-publication`（3 · @Module imports forFeature）、`agent-plugin`（2 · getRepository） |
| `knowledge_document_chunk` | 5 | `knowledge-document`（9 · @Module imports forFeature）、`knowledge-processing-lifecycle`（8 · @InjectRepository）、`knowledgebase`（4 · getRepository）、`knowledge-wiki`（3 · @Module imports forFeature）、`graphrag`（1 · getRepository） |
| `agent_runtime_binding` | 5 | `agent-invocation`（6 · @Module imports forFeature）、`xpert-project-access`（4 · getRepository）、`xpert-project`（4 · getRepository）、`handoff-queue`（3 · getRepository）、`model-execution`（3 · @Module imports forFeature） |
| `conversation_file_link` | 5 | `file-understanding`（15 · @Module imports forFeature）、`chat-conversation`（1 · getRepository）、`conversation-branch`（1 · getRepository）、`xpert-project-access`（1 · getRepository）、`xpert-project`（1 · getRepository） |
| `xpert_workspace` | 5 | `xpert-workspace`（7 · @Module imports forFeature）、`plugin-resource`（5 · @Module imports forFeature）、`skill-package`（3 · @Module imports forFeature）、`xpert-template`（3 · @Module imports forFeature）、`agent-invocation`（1 · getRepository） |
| `email_template` | 5 | `email-template`（5 · @Module imports forFeature）、`email`（4 · getRepository）、`auth`（2 · @InjectRepository）、`invite`（2 · @InjectRepository）、`tenant`（2 · @InjectRepository） |
| `tag` | 5 | `tag`（7 · @Module imports forFeature）、`knowledgebase`（5 · @Module imports forFeature）、`super-admin-organization-scope`（1 · getRepository）、`enterprise-chatkit`（1 · getRepository）、`xpert`（1 · getRepository） |
| `xpert_project` | 4 | `xpert-project-access`（36 · @Module imports forFeature）、`xpert-project`（36 · @Module imports forFeature）、`agent-invocation`（1 · getRepository）、`file-understanding`（1 · @Module imports forFeature） |
| `file_asset` | 4 | `file-understanding`（39 · @Module imports forFeature）、`xpert-project`（3 · @Module imports forFeature）、`xpert-project-access`（2 · @InjectRepository）、`chat-message`（1 · @Module imports forFeature） |
| `agent_runtime_delivery` | 4 | `handoff-queue`（19 · getRepository）、`agent-invocation`（7 · @Module imports forFeature）、`xpert-project-access`（1 · getRepository）、`xpert-project`（1 · getRepository） |
| `membership_point_ledger` | 4 | `membership`（11 · @Module imports forFeature）、`copilot-usage`（7 · @Module imports forFeature）、`model-execution`（3 · @Module imports forFeature）、`model-gateway`（2 · Repository<T>） |
| `copilot` | 4 | `copilot`（5 · @Module imports forFeature）、`membership`（4 · @Module imports forFeature）、`model-access`（3 · @Module imports forFeature）、`model-execution`（3 · @Module imports forFeature） |
| `skill_package` | 4 | `plugin-resource`（5 · @Module imports forFeature）、`skill-package`（5 · @Module imports forFeature）、`skill-repository`（3 · @Module imports forFeature）、`agent-plugin`（1 · getRepository） |
| `tenant` | 4 | `tenant`（6 · @Module imports forFeature）、`tenant-admin-cli`（4 · @Module imports forFeature）、`seeder`（2 · getRepository）、`auth`（1 · getRepository） |
| `xpert_assistant_user_preference` | 4 | `xpert`（4 · @Module imports forFeature）、`chat-conversation`（3 · @Module imports forFeature）、`model-execution`（3 · @Module imports forFeature）、`enterprise-chatkit`（3 · @InjectRepository） |
| `external_identity_binding` | 4 | `account-binding`（5 · @Module imports forFeature）、`auth`（3 · getRepository）、`tenant-admin-cli`（1 · getRepository）、`user`（1 · getRepository） |
| `xpert_project_task` | 3 | `xpert-project`（35 · @Module imports forFeature）、`xpert-project-access`（34 · getRepository）、`handoff-queue`（8 · getRepository） |
| `xpert_project_task_execution` | 3 | `xpert-project`（16 · @Module imports forFeature）、`xpert-project-access`（15 · @InjectRepository）、`handoff-queue`（2 · getRepository） |
| `plugin_application_installation` | 3 | `plugin-resource`（13 · @Module imports forFeature）、`xpert-project`（3 · @Module imports forFeature）、`xpert-project-access`（2 · @InjectRepository） |
| `copilot_checkpoint` | 3 | `chat-conversation`（7 · @Module imports forFeature）、`copilot-checkpoint`（7 · @Module imports forFeature）、`conversation-branch`（1 · getRepository） |
| `xpert_task` | 3 | `xpert-task`（5 · @Module imports forFeature）、`xpert-project`（4 · @Module imports forFeature）、`xpert-project-access`（3 · getRepository） |
| `feature` | 3 | `feature`（6 · @Module imports forFeature）、`xpert-project`（3 · @Module imports forFeature）、`xpert-project-access`（2 · @InjectRepository） |
| `integration` | 3 | `integration`（7 · @Module imports forFeature）、`enterprise-chatkit`（1 · getRepository）、`xpert`（1 · getRepository） |
| `invite` | 3 | `invite`（3 · @Module imports forFeature）、`organization`（3 · @Module imports forFeature）、`role`（3 · @Module imports forFeature） |
| `mcp_capability_catalog` | 3 | `mcp-publication`（4 · @InjectRepository）、`xpert-toolset`（3 · @Module imports forFeature）、`server-ai`（2 · @InjectRepository） |
| `user_group` | 3 | `organization`（3 · @Module imports forFeature）、`user-group`（3 · @Module imports forFeature）、`xpert-marketplace`（3 · @Module imports forFeature） |
| `business_area` | 3 | `business-area`（3 · @Module imports forFeature）、`xpert`（3 · @Module imports forFeature）、`enterprise-chatkit`（2 · @InjectRepository） |
| `xpert_agent` | 3 | `xpert-agent`（4 · @Module imports forFeature）、`chat-conversation`（3 · @Module imports forFeature）、`graphrag`（1 · getRepository） |
| `artifact` | 3 | `artifacts`（5 · @Module imports forFeature）、`xpert-project-access`（1 · getRepository）、`xpert-project`（1 · getRepository） |
| `assistant_template_publication` | 3 | `enterprise-chatkit`（3 · getRepository）、`xpert`（3 · getRepository）、`xpert-template`（1 · getRepository） |
| `email_verification` | 3 | `user`（3 · @Module imports forFeature）、`tenant-admin-cli`（2 · @InjectRepository）、`auth`（2 · @InjectRepository） |
| `chat_group_participant` | 2 | `chat-group`（35 · @Module imports forFeature）、`ai`（1 · getRepository） |
| `knowledge_wiki_page` | 2 | `knowledge-wiki`（24 · @Module imports forFeature）、`knowledgebase`（3 · @Module imports forFeature） |
| `knowledge_wiki_page_version` | 2 | `knowledge-wiki`（16 · @Module imports forFeature）、`knowledgebase`（3 · @Module imports forFeature） |
| `assistant_template_upgrade` | 2 | `enterprise-chatkit`（9 · getRepository）、`xpert`（9 · getRepository） |
| `xpert_project_membership` | 2 | `xpert-project-access`（9 · @Module imports forFeature）、`xpert-project`（9 · @Module imports forFeature） |
| `knowledge_wiki_source_state` | 2 | `knowledge-wiki`（14 · @Module imports forFeature）、`knowledgebase`（3 · @Module imports forFeature） |
| `model_gateway_call` | 2 | `model-execution`（10 · @Module imports forFeature）、`model-gateway`（5 · @Module imports forFeature） |
| `xpert_project_task_step` | 2 | `xpert-project`（8 · @Module imports forFeature）、`xpert-project-access`（7 · getRepository） |
| `plugin_resource_installation` | 2 | `plugin-resource`（9 · @Module imports forFeature）、`xpert-toolset`（3 · @Module imports forFeature） |
| `xpert_project_asset` | 2 | `xpert-project`（6 · @Module imports forFeature）、`xpert-project-access`（5 · getRepository） |
| `xpert_project_automation` | 2 | `xpert-project`（6 · @Module imports forFeature）、`xpert-project-access`（5 · getRepository） |
| `xpert_project_milestone` | 2 | `xpert-project`（6 · @Module imports forFeature）、`xpert-project-access`（5 · getRepository） |
| `xpert_project_plan` | 2 | `xpert-project`（6 · @Module imports forFeature）、`xpert-project-access`（5 · getRepository） |
| `copilot_user` | 2 | `copilot-user`（7 · @Module imports forFeature）、`copilot-usage`（3 · @Module imports forFeature） |
| `knowledge_wiki_page_evidence` | 2 | `knowledge-wiki`（7 · @Module imports forFeature）、`knowledgebase`（3 · @Module imports forFeature） |
| `copilot_organization` | 2 | `copilot-organization`（6 · @Module imports forFeature）、`copilot-usage`（3 · @Module imports forFeature） |
| `mcp_publication_capability` | 2 | `mcp-publication`（6 · @InjectRepository）、`xpert-toolset`（3 · @Module imports forFeature） |
| `realtime_voice_task` | 2 | `ai`（5 · @Module imports forFeature）、`server-ai`（4 · @InjectRepository） |
| `xpert_project_automation_run` | 2 | `xpert-project`（5 · @Module imports forFeature）、`xpert-project-access`（4 · @InjectRepository） |
| `copilot_checkpoint_writes` | 2 | `copilot-checkpoint`（5 · @Module imports forFeature）、`chat-conversation`（3 · @Module imports forFeature） |
| `mcp_publication` | 2 | `mcp-publication`（5 · @InjectRepository）、`plugin-resource`（3 · @Module imports forFeature） |
| `skill_repository` | 2 | `skill-repository`（5 · @Module imports forFeature）、`xpert-template`（3 · @Module imports forFeature） |
| `copilot_provider_model` | 2 | `copilot-provider`（4 · @Module imports forFeature）、`model-access`（3 · @Module imports forFeature） |
| `model_gateway_publication` | 2 | `model-access`（4 · @Module imports forFeature）、`model-gateway`（3 · @Module imports forFeature） |
| `xpert_project_activity` | 2 | `xpert-project`（4 · @Module imports forFeature）、`xpert-project-access`（3 · getRepository） |
| `xpert_project_invitation` | 2 | `xpert-project`（4 · @Module imports forFeature）、`xpert-project-access`（3 · @InjectRepository） |
| `employee` | 2 | `employee`（4 · @Module imports forFeature）、`shared`（2 · @InjectRepository） |
| `realtime_voice_session` | 2 | `server-ai`（3 · @InjectRepository）、`ai`（3 · @Module imports forFeature） |
| `xpert_tool` | 2 | `plugin-resource`（3 · @Module imports forFeature）、`xpert-tool`（3 · @Module imports forFeature） |
| `knowledge_document_page` | 2 | `knowledge-document`（3 · @Module imports forFeature）、`knowledge-processing-lifecycle`（2 · @InjectRepository） |
| `knowledge_identity` | 2 | `knowledge-identity`（4 · @Module imports forFeature）、`graphrag`（1 · getRepository） |
| `knowledge_identity_observation` | 2 | `knowledge-identity`（4 · @Module imports forFeature）、`graphrag`（1 · getRepository） |
| `mcp_app_audit` | 2 | `xpert-toolset`（3 · @Module imports forFeature）、`server-ai`（2 · @InjectRepository） |
| `mcp_app_history` | 2 | `xpert-toolset`（3 · @Module imports forFeature）、`server-ai`（2 · @InjectRepository） |
| `mcp_publication_access` | 2 | `plugin-resource`（3 · @Module imports forFeature）、`mcp-publication`（2 · @InjectRepository） |
| `organization_contact` | 2 | `organization-contact`（3 · @Module imports forFeature）、`invite`（2 · @InjectRepository） |
| `realtime_voice_turn` | 2 | `ai`（3 · @Module imports forFeature）、`server-ai`（2 · @InjectRepository） |
| `shell_cli_execution` | 2 | `model-execution`（3 · @Module imports forFeature）、`server-ai`（2 · @InjectRepository） |
| `shell_process_execution` | 2 | `model-execution`（3 · @Module imports forFeature）、`server-ai`（2 · @InjectRepository） |
| `xpert_frequent_question_cache` | 2 | `xpert`（3 · @Module imports forFeature）、`enterprise-chatkit`（2 · @InjectRepository） |
| `xpert_mcp_consumer_oauth_credential` | 2 | `xpert-toolset`（3 · @Module imports forFeature）、`server-ai`（2 · @InjectRepository） |
| `xpert_mcp_consumer_oauth_session` | 2 | `xpert-toolset`（3 · @Module imports forFeature）、`server-ai`（2 · @InjectRepository） |
| `xpert_project_sprint` | 2 | `xpert-project`（3 · @Module imports forFeature）、`xpert-project-access`（2 · @InjectRepository） |
| `xpert_project_swimlane` | 2 | `xpert-project`（3 · @Module imports forFeature）、`xpert-project-access`（2 · @InjectRepository） |
| `xpert_project_task_conversation` | 2 | `xpert-project`（3 · @Module imports forFeature）、`xpert-project-access`（2 · @InjectRepository） |
| `xpert_project_file` | 2 | `xpert-project-access`（2 · @InjectRepository）、`xpert-project`（2 · @InjectRepository） |
| `model_usage_delivery_receipt` | 2 | `copilot-user`（2 · @Module imports forFeature）、`copilot-usage`（1 · @Module imports forFeature） |
| `knowledge_wiki_job` | 1 | `knowledge-wiki`（43 · @Module imports forFeature） |
| `user_membership` | 1 | `membership`（30 · @Module imports forFeature） |
| `chat_message_recipient` | 1 | `chat-group`（25 · @Module imports forFeature） |
| `knowledge_graph_index_job` | 1 | `graphrag`（24 · @Module imports forFeature） |
| `membership_plan` | 1 | `membership`（19 · @Module imports forFeature） |
| `user_model_grant` | 1 | `model-access`（19 · @Module imports forFeature） |
| `file_chunk` | 1 | `file-understanding`（17 · @Module imports forFeature） |
| `user_membership_period` | 1 | `membership`（17 · @Module imports forFeature） |
| `model_access_request` | 1 | `model-access`（16 · @Module imports forFeature） |
| `file_artifact` | 1 | `file-understanding`（15 · @Module imports forFeature） |
| `agent_plugin_package` | 1 | `agent-plugin`（13 · @Module imports forFeature） |
| `agent_evolution_release_package` | 1 | `agent-evolution`（12 · @Module imports forFeature） |
| `agent_evolution_audit_event` | 1 | `agent-evolution`（11 · @Module imports forFeature） |
| `file_embedding` | 1 | `file-understanding`（11 · @Module imports forFeature） |
| `knowledge_wiki_folder` | 1 | `knowledge-wiki`（11 · @Module imports forFeature） |
| `knowledge_wiki_page_contribution` | 1 | `knowledge-wiki`（11 · @Module imports forFeature） |
| `model_execution_grant` | 1 | `model-execution`（11 · @Module imports forFeature） |
| `agent_resource_binding` | 1 | `agent-plugin`（10 · @Module imports forFeature） |
| `knowledge_graph_entity` | 1 | `graphrag`（10 · @Module imports forFeature） |
| `agent_evolution_approval` | 1 | `agent-evolution`（9 · @Module imports forFeature） |
| `assistant_binding` | 1 | `assistant-binding`（9 · @Module imports forFeature） |
| `knowledge_wiki_model_invocation` | 1 | `knowledge-wiki`（9 · @Module imports forFeature） |
| `knowledge_wiki_source_map_result` | 1 | `knowledge-wiki`（9 · @Module imports forFeature） |
| `referral_code` | 1 | `referral`（9 · @Module imports forFeature） |
| `agent_evolution_proposal` | 1 | `agent-evolution`（8 · @Module imports forFeature） |
| `knowledge_graph_relation` | 1 | `graphrag`（8 · @Module imports forFeature） |
| `knowledge_wiki_page_link` | 1 | `knowledge-wiki`（8 · @Module imports forFeature） |
| `knowledge_wiki_placement` | 1 | `knowledge-wiki`（8 · @Module imports forFeature） |
| `model_access_event` | 1 | `model-access`（8 · @Module imports forFeature） |
| `agent_evolution_active_pointer` | 1 | `agent-evolution`（7 · @Module imports forFeature） |
| `file_citation_anchor` | 1 | `file-understanding`（7 · @Module imports forFeature） |
| `agent_evolution_candidate` | 1 | `agent-evolution`（6 · @Module imports forFeature） |
| `agent_evolution_capability_version` | 1 | `agent-evolution`（6 · @Module imports forFeature） |
| `agent_evolution_evaluation_run` | 1 | `agent-evolution`（6 · @Module imports forFeature） |
| `agent_invocation_activity_state` | 1 | `agent-invocation`（6 · @Module imports forFeature） |
| `artifact_version` | 1 | `artifacts`（6 · @Module imports forFeature） |
| `chat_group_interaction` | 1 | `chat-group`（6 · @Module imports forFeature） |
| `knowledge_graph_entity_contribution` | 1 | `graphrag`（6 · @Module imports forFeature） |
| `knowledge_graph_relation_contribution` | 1 | `graphrag`（6 · @Module imports forFeature） |
| `agent_evolution_canary_test_override` | 1 | `agent-evolution`（5 · @Module imports forFeature） |
| `agent_evolution_release_deployment` | 1 | `agent-evolution`（5 · @Module imports forFeature） |
| `agent_evolution_target` | 1 | `agent-evolution`（5 · @Module imports forFeature） |
| `api_key` | 1 | `api-key`（5 · @Module imports forFeature） |
| `artifact_link` | 1 | `artifacts`（5 · @Module imports forFeature） |
| `chat_conversation_goal` | 1 | `chat-conversation`（5 · @Module imports forFeature） |
| `data_source` | 1 | `data-source`（5 · @Module imports forFeature） |
| `desktop_shell_grant` | 1 | `desktop-shell`（5 · @Module imports forFeature） |
| `desktop_shell_operation` | 1 | `desktop-shell`（5 · @Module imports forFeature） |
| `knowledge_document_tag` | 1 | `knowledgebase`（5 · @Module imports forFeature） |
| `knowledge_graph_mention` | 1 | `graphrag`（5 · @Module imports forFeature） |
| `model_execution_reconciliation` | 1 | `model-execution`（5 · @Module imports forFeature） |
| `prompt_workflow` | 1 | `prompt-workflow`（5 · @Module imports forFeature） |
| `xpert_connector` | 1 | `connector`（5 · @Module imports forFeature） |
| `xpert_task_execution` | 1 | `xpert-task`（5 · @Module imports forFeature） |
| `agent_evolution_capability_bundle` | 1 | `agent-evolution`（4 · @Module imports forFeature） |
| `agent_evolution_dataset_snapshot` | 1 | `agent-evolution`（4 · @Module imports forFeature） |
| `agent_evolution_learning_event` | 1 | `agent-evolution`（4 · @Module imports forFeature） |
| `agent_evolution_runtime_observation` | 1 | `agent-evolution`（4 · @Module imports forFeature） |
| `agent_invocation_activity_item` | 1 | `agent-invocation`（4 · @Module imports forFeature） |
| `collaboration_document` | 1 | `collaboration`（4 · @Module imports forFeature） |
| `collaboration_update` | 1 | `collaboration`（4 · @Module imports forFeature） |
| `desktop_shell_device` | 1 | `desktop-shell`（4 · @Module imports forFeature） |
| `knowledgebase_task` | 1 | `knowledgebase`（4 · @Module imports forFeature） |
| `language` | 1 | `language`（4 · @Module imports forFeature） |
| `managed_connection` | 1 | `managed-connection`（4 · @Module imports forFeature） |
| `mcp_api_key` | 1 | `mcp-publication`（4 · @InjectRepository） |
| `mcp_invocation_audit` | 1 | `mcp-publication`（4 · @InjectRepository） |
| `mcp_oauth_policy` | 1 | `mcp-publication`（4 · @InjectRepository） |
| `plugin_marketplace_registry_item` | 1 | `plugin`（4 · @Module imports forFeature） |
| `plugin_marketplace_source` | 1 | `plugin`（4 · @Module imports forFeature） |
| `referral_relation` | 1 | `referral`（4 · @Module imports forFeature） |
| `role_permission` | 1 | `role-permission`（4 · @Module imports forFeature） |
| `xpert_template` | 1 | `xpert-template`（4 · @Module imports forFeature） |
| `agent_evolution_diagnosis` | 1 | `agent-evolution`（3 · @Module imports forFeature） |
| `agent_evolution_event_cluster` | 1 | `agent-evolution`（3 · @Module imports forFeature） |
| `agent_evolution_experience` | 1 | `agent-evolution`（3 · @Module imports forFeature） |
| `agent_evolution_job` | 1 | `agent-evolution`（3 · @Module imports forFeature） |
| `agent_invocation_wait` | 1 | `agent-invocation`（3 · @Module imports forFeature） |
| `artifact_access_log` | 1 | `artifacts`（3 · @Module imports forFeature） |
| `assistant_binding_user_preference` | 1 | `assistant-binding`（3 · @Module imports forFeature） |
| `auto_task` | 1 | `xpert-task`（3 · @Module imports forFeature） |
| `auto_task_template` | 1 | `xpert-task`（3 · @Module imports forFeature） |
| `chat_conversation_read_state` | 1 | `chat-conversation`（3 · @Module imports forFeature） |
| `chat_message_feedback` | 1 | `chat-message-feedback`（3 · @Module imports forFeature） |
| `cli_session` | 1 | `model-execution`（3 · @Module imports forFeature） |
| `contact` | 1 | `contact`（3 · @Module imports forFeature） |
| `copilot_knowledge` | 1 | `copilot-knowledge`（3 · @Module imports forFeature） |
| `copilot_model` | 1 | `copilot-model`（3 · @Module imports forFeature） |
| `copilot_provider` | 1 | `copilot-provider`（3 · @Module imports forFeature） |
| `copilot_store` | 1 | `copilot-store`（3 · @Module imports forFeature） |
| `country` | 1 | `country`（3 · @Module imports forFeature） |
| `currency` | 1 | `currency`（3 · @Module imports forFeature） |
| `custom_smtp` | 1 | `custom-smtp`（3 · @Module imports forFeature） |
| `data_source_authentication` | 1 | `data-source`（3 · @Module imports forFeature） |
| `data_source_type` | 1 | `data-source-type`（3 · @Module imports forFeature） |
| `environment` | 1 | `environment`（3 · @Module imports forFeature） |
| `import-history` | 1 | `import-history`（3 · @Module imports forFeature） |
| `import-record` | 1 | `import-record`（3 · @Module imports forFeature） |
| `knowledge_graph_community` | 1 | `graphrag`（3 · @Module imports forFeature） |
| `knowledge_retrieval_log` | 1 | `knowledgebase`（3 · @Module imports forFeature） |
| `knowledge_wiki_page_reduce_input` | 1 | `knowledge-wiki`（3 · @Module imports forFeature） |
| `knowledge_wiki_page_reduce_input_source` | 1 | `knowledge-wiki`（3 · @Module imports forFeature） |
| `knowledge_wiki_projection_state` | 1 | `knowledge-wiki`（3 · @Module imports forFeature） |
| `knowledgebase_tag` | 1 | `knowledgebase`（3 · @Module imports forFeature） |
| `mcp_runtime_instance` | 1 | `xpert-toolset`（3 · @Module imports forFeature） |
| `model_gateway_api_key` | 1 | `model-gateway`（3 · @Module imports forFeature） |
| `model_gateway_settings` | 1 | `model-gateway`（3 · @Module imports forFeature） |
| `organization_language` | 1 | `organization-language`（3 · @Module imports forFeature） |
| `password_reset` | 1 | `password-reset`（3 · @Module imports forFeature） |
| `plugin_instance` | 1 | `plugin`（3 · @Module imports forFeature） |
| `sandbox_job` | 1 | `sandbox`（3 · @Module imports forFeature） |
| `sandbox_managed_service` | 1 | `sandbox`（3 · @Module imports forFeature） |
| `schedule_note` | 1 | `xpert-task`（3 · @Module imports forFeature） |
| `secret_token` | 1 | `secret-token`（3 · @Module imports forFeature） |
| `skill_repository_index` | 1 | `skill-repository-index`（3 · @Module imports forFeature） |
| `storage_file` | 1 | `storage-file`（3 · @Module imports forFeature） |
| `template_installation` | 1 | `plugin-resource`（3 · @Module imports forFeature） |
| `xpert_access_request` | 1 | `xpert-marketplace`（3 · @Module imports forFeature） |
| `xpert_connector_oauth_session` | 1 | `connector`（3 · @Module imports forFeature） |
| `xpert_connector_personal_grant` | 1 | `connector`（3 · @Module imports forFeature） |
| `xpert_table` | 1 | `xpert-table`（3 · @Module imports forFeature） |
| `xpert_task_template` | 1 | `xpert-task`（3 · @Module imports forFeature） |
| `agent_invocation_event` | 1 | `agent-invocation`（2 · @Module imports forFeature） |
| `knowledge_wiki_taxonomy` | 1 | `knowledge-wiki`（2 · @Module imports forFeature） |
| `mcp_task` | 1 | `mcp-publication`（2 · @InjectRepository） |
| `xpert_connector_personal_account` | 1 | `connector`（2 · @Module imports forFeature） |
| `xpert_connector_runtime_audit` | 1 | `connector`（2 · @Module imports forFeature） |
| `email_sent` | 1 | `email`（1 · @Module imports forFeature） |
| `knowledge_document_deletion_cleanup_receipt` | 1 | `knowledge-document`（1 · @Module imports forFeature） |
| `knowledge_document_deletion_intent` | 1 | `knowledge-document`（1 · @Module imports forFeature） |
| `knowledge_document_publication_attempt` | 1 | `knowledge-document`（1 · @Module imports forFeature） |
| `knowledge_document_publication_attempt_source` | 1 | `knowledge-document`（1 · @Module imports forFeature） |
| `xpert_project_task_log` | 1 | `xpert-project`（1 · @Module imports forFeature） |
