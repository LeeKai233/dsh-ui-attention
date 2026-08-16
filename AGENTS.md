# AGENTS.md — dsh-ui-attention 插件仓库 agent 规则

在本仓库工作的 agent：

1. 先读鲸选规范 https://github.com/LeeKai233/dsh-whale-picks/blob/main/spec/SPEC.md 、
   spec/PARADIGM.md（插件范式）与 spec/AGENT.md。
2. 本仓库是鲸选范式的**试验品**（第一个过范式的插件）：固定分区一个不少，插件自己的
   「唯一一件事」填进扩展点；本仓库的「有意豁免」清单见 docs/DEVELOPMENT.md
   （--structure / template-sync 对照时以该清单为准）。
3. whalepicks.json 是上架合同：改动功能时同步检查 scope/patches/capabilities 声明是否
   仍然属实（capabilities.network 为 false 是事实——本插件零网络请求）。
4. package.json 的 name/version 与 whalepicks.json 必须同步；files 必须含 whalepicks.json。
5. cordis.patch.yml 的 insert id（ui-attention）保持唯一，绝不写进用户 profile 补丁层
   （duplicate loader entry id 会拒绝启动）。
6. 槽位遮蔽：要遮蔽同 id 的内置/其他条目，必须用更低的 priority（最低者渲染）；
   同 id 同 priority 会被槽位核心拒绝。
7. 客户端 bundle 只 import 平台模块（react/cordis/dsh-client-ui-*）；schemastery 只许
   出现在宿主半区；文案走 locale zh/en 双语（locales.ts 之外不得出现 UI 文案）。
8. 设置持久化：浏览器走 runtime 快照引擎（豁免项），宿主半区仍注册 ui-attention 命名空间。
9. 测试：npm test 必须绿。
10. 门槛校验：跑 whale-picks 仓库的 scripts/check-plugin.mjs（exit 0 才算合规）与
    --structure（对齐报告，豁免项除外全绿）。
