# dsh-ui-attention

仓库地址：https://github.com/LeeKai233/dsh-ui-attention — npm：https://www.npmjs.com/package/dsh-ui-attention

![npm version](https://img.shields.io/npm/v/dsh-ui-attention) ![license](https://img.shields.io/npm/l/dsh-ui-attention)

DeepSeek Harness (DSH) Web UI 的操作提醒插件：只要 DSH 页面**不在最顶层**——标签页
隐藏、窗口最小化、或被其它应用盖住（document.hidden 或 !document.hasFocus()）——
一旦有事发生，插件就会触发：

1. **浏览器系统通知**（点击即可聚焦窗口并打开对应会话）；
2. 一段短 **WebAudio 提示音**（无需任何音频文件）；
3. 有待处理交互时**标签页标题闪烁**（`(!) ` 前缀交替）。

提醒覆盖两类事件：待处理交互（`ask_user_question` 提问、等待批准的计划、工具/命令
审批）与**回合完成**（任意会话回合结束），每个回合各提醒一次，正文带会话标题。页面
处于最顶层且聚焦时完全静默。

它是双面 DSH 插件（`dsh.client`，platform `web`），同时以迷你 bundle 形式发布：
安装即自动进入组合，无需手改任何 DSH 内部文件。

## 安装

```sh
dsh plugin --profile web add dsh-ui-attention
# 重启一次 dsh web 使新的 bundle 层生效
dsh web
```

或从本地目录安装：

```sh
dsh plugin --profile web add file:/path/to/dsh-ui-attention
```

然后重启一次 `dsh web`：bundle 层（以及注册 `ui-attention` 设置命名空间的插件
宿主侧）在启动时生效。

### 不经过 dsh plugin 的手工安装

作为 bundle 路线的**替代方案**（二选一，绝不能同时用）：把包拷进
`~/.dsh/profiles/web/node_modules/`，并把下面这行插进 profile 补丁层
`~/.dsh/profiles/web/cordis.patch.yml`：

```yaml
- insert:
    - id: ui-attention
      name: "dsh-ui-attention"
```

> **切勿两种方式同时使用。** `insert` 行不会跨层按 id 去重：bundle 补丁与
> profile 补丁同时提供同一个 `id: ui-attention` 会让加载器拒绝启动，报错
> `duplicate loader entry id: ui-attention`。两条组合路线只能选一条。

## 使用

- 打开 Web UI 的 **General 设置**：**通知与提醒** 行提供 5 个 iOS 式滑动开关（通知 /
  提示音 / 标题闪烁 / 仅后台提醒 / 回合完成提醒）和一个 **发送测试通知** 按钮。
- **什么时候提醒？** 只要 DSH 页面不在最顶层——标签页隐藏、窗口最小化、或被其它
  应用盖住（document.hidden 或 !document.hasFocus()）——就提醒；页面处于最顶层且
  聚焦时完全静默。
- 两类事件都提醒：待处理交互（提问 / 计划审批 / 工具审批）与**回合完成**（任意会话
  running 翻转），每个回合各提醒一次，正文带会话标题；点击通知聚焦窗口并打开对应
  会话。
- 浏览器通知权限在你点击测试按钮时申请（浏览器只允许在用户手势中请求）。权限为
  `default` 时该行会显示启用提示，插件自动降级为 声音 + 标题闪烁。
- 刷新页面或重连不会重复提醒；交互解决后对应通知自动关闭、标题恢复。

## 设置项

5 个开关（默认全部开启）持久化在浏览器的 localStorage 键
dsh-ui-attention.settings 中：

| 字段 | 含义 |
| --- | --- |
| enabled | 总开关：关闭后弹窗、声音、标题闪烁全部静默 |
| sound | 播放 WebAudio 提示音 |
| titleFlash | 有待处理交互时标签页标题闪烁 |
| onlyWhenHidden | 仅页面不在最顶层时提醒；关闭后顶层也会提醒 |
| notifyOnDone | 会话回合结束时弹窗与响铃 |

为什么用浏览器本地存储而不是宿主人设置文档：rc.6 的 Web API 网关只向浏览器暴露
一个硬编码的设置命名空间白名单（packages/host/apiproxy/src/api-proxy.ts 中的
WEB_SETTINGS_NAMESPACES），其余命名空间一律返回 settings-not-exposed——
「把暴露声明移到 settings.register()」在上游是已记录的延期工作。插件的宿主 node 侧
仍然会在服务端注册 ui-attention 命名空间，等上游放开该限制后该 section 自动生效。

## 常见问题

- **没有弹窗？** 在浏览器站点设置里允许通知，然后点一次测试按钮。权限被拒时自动降级
  为声音 + 标题提醒。
- **页面被其它应用盖住但不提醒？** 插件把「处于最顶层且聚焦」视为「你正在看着它」。
  关掉「仅后台提醒」开关即可在顶层时也提醒。
- **没有声音？** 浏览器自动播放策略要求先有一次用户手势；插件在首次点击/按键时解锁
  AudioContext，失败会在后续手势中重试。
- **开了多个标签页？** 每个标签页各自提醒（跨标签页无法去重），建议只保留一个 DSH
  标签页。
- **哪些事件会提醒？** 提问（`ask_user_question`）、计划审批（`plan-review` 意图）、
  工具/命令审批（`approval/requested`）以及回合完成（任意会话 running 翻转）。

## 环境要求

- DeepSeek Harness 0.1.0-rc.6 或更新（插件读取会话列表的 pendingInteraction 状态与
  settings.general.item 槽位）
- web profile（dsh --profile web）
- 浏览器允许 DSH 站点的通知（点一次测试按钮授权即可）

## 发布

已发布到 npm（包名 `dsh-ui-attention`，MIT）。后续版本：

```sh
npm version patch          # 或 minor / major
pnpm bundle && pnpm test
npm publish                # 账号开启 2FA 时加 --otp=<验证码>
```

发布包自带已构建的 lib/ 与 bundle 补丁，使用者无需任何构建步骤。

## 开发

```sh
pnpm install
pnpm test        # vitest：T1-T17 TDD 套件 + 构建产物冒烟
pnpm bundle      # tsdown -> lib/index.js（宿主）+ lib/client.js（浏览器）
```

架构：`attention-engine.ts` 是对会话列表的纯状态机（待处理交互状态 + running 边沿的
回合完成检测、基线播种、按回合去重、页面不在最顶层门控）；`notifications.ts`、
`beep.ts`、`title-flash.ts` 是可注入的平台接线；`client/index.ts` 基于
`ctx.sessions.list` 与 `settings.general.item` 槽位完成装配，开关经运行时快照存储
引擎持久化到 localStorage。宿主 node 侧注册 `ui-attention` 设置命名空间以备将来
兼容。

## 卸载

```sh
dsh plugin --profile web remove dsh-ui-attention
# 同时删除 ~/.dsh/profiles/web/cordis.patch.yml 中手工添加的 ui-attention insert 行
# 然后重启 dsh web
```

## License

MIT
