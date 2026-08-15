# AGENTS.md — dsh-ui-attention 插件仓库 agent 规则

在本仓库工作的 agent：

1. 先读鲸选规范 https://github.com/LeeKai233/dsh-whale-picks/blob/main/spec/SPEC.md 与 spec/AGENT.md。
2. whalepicks.json 是上架合同：改动功能时同步检查 scope/patches/capabilities 声明是否仍然属实。
3. package.json 的 name/version 与 whalepicks.json 必须同步。
4. cordis.patch.yml 的 insert id（ui-attention）保持唯一，绝不写进用户 profile 补丁层（duplicate loader entry id）。
5. 客户端 bundle 只 import 平台模块（react/cordis/dsh-client-ui-*）；文案走 locale zh/en 双语。
6. 测试：npm test 必须绿。
7. 门槛校验：跑 whale-picks 仓库的 scripts/check-plugin.mjs，exit 0 才算合规。
