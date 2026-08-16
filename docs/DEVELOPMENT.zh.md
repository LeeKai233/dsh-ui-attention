# DEVELOPMENT.zh.md — dsh-ui-attention 开发者文档

## 有意豁免清单（范式试验品）

本仓库是鲸选范式的试验品。用 dsh-whale-picks/scripts 的 --structure /
template-sync 对照时，以下有意豁免是比对基准（其余全部与模板对齐）：

1. **设置持久化**使用 runtime 快照存储引擎（defineStore，来自
   @deepseek-ai/dsh-client-runtime/client），而非模板的裸 localStorage 版本
   ——扩展点 4 的惯用法 2。
2. **tsdown PLATFORM_MODULES** 在模板核心之外增加
   @deepseek-ai/dsh-client-ui-attachment 与 @deepseek-ai/dsh-client-schema-form
   ——模板给全量清单、插件按需裁剪；本插件客户端恰好 import 这两个。
3. **devDependencies** 在模板基线之外增加 @deepseek-ai/dsh-client-ui-primitives、
   @deepseek-ai/dsh-client-ui-settings 与 @testing-library/react（组件测试用）。
4. **tests/shims** 目录源自本仓库并已回流进模板——现在天然对齐。

## 构建与测试

```sh
pnpm install
pnpm test        # vitest：T1-T21 TDD 套件 + 构建产物冒烟
pnpm bundle      # tsdown -> lib/index.js（宿主）+ lib/client.js（浏览器）
```

## 架构

- attention-engine.ts：对会话列表的纯状态机。待处理交互状态 + running 边沿的回合
  完成检测；基线播种；按回合去重；按会话门控（页面不在前台时全部提醒；前台时当前
  会话安静、其它会话仍提醒）。
- notifications.ts / beep.ts / title-flash.ts：可注入的平台接线。
- client/index.ts：基于 ctx.sessions.list 与 settings.general.item 槽位装配。
- settings-store.ts：开关经运行时快照存储引擎持久化到 localStorage。
- 宿主 node 侧注册 ui-attention 设置命名空间，以备将来兼容。

## 设置持久化的取舍

开关存在浏览器 localStorage，而非宿主人设置文档。原因：rc.6 的 Web API 网关只向
浏览器暴露硬编码的设置命名空间白名单（packages/host/apiproxy/src/api-proxy.ts 中
的 WEB_SETTINGS_NAMESPACES），其余命名空间一律返回 settings-not-exposed——「把
暴露声明移到 settings.register()」在上游是已记录的延期工作。宿主 node 侧仍然注册
ui-attention 命名空间，等上游放开该限制后该 section 自动生效。

## 发布

已发布到 npm（包名 dsh-ui-attention，MIT）。后续版本：

```sh
npm version patch          # 或 minor / major
pnpm bundle && pnpm test
npm publish                # 账号开启 2FA 时加 --otp=<验证码>
```

发布包自带已构建的 lib/ 与 bundle 补丁，使用者无需任何构建步骤。

## 手工安装（不经过 dsh plugin）

作为 bundle 路线的替代方案（二选一，绝不能同时用）：把包拷进
~/.dsh/profiles/web/node_modules/，并把下面这行插进 profile 补丁层
~/.dsh/profiles/web/cordis.patch.yml：

```yaml
- insert:
    - id: ui-attention
      name: "dsh-ui-attention"
```

insert 行不会跨层按 id 去重：bundle 补丁与 profile 补丁同时提供同一个 id 会让加载器
拒绝启动，报错 duplicate loader entry id。两条组合路线只能选一条。

## 环境要求

- DeepSeek Harness 0.1.0-rc.6 或更新（读取会话列表 pendingInteraction 状态与
  settings.general.item 槽位）
- web profile（dsh --profile web）
- 浏览器允许 DSH 站点的通知（点一次测试按钮授权即可）
