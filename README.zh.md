# dsh-ui-attention

DeepSeek Harness (DSH) Web UI 的操作提醒插件：当 agent 需要你处理——
`ask_user_question` 提问、等待批准的计划、工具/命令审批——而页面被隐藏或在后台时，
插件会触发：

1. **浏览器系统通知**（点击即可聚焦窗口并打开对应会话）；
2. 一段短 **WebAudio 提示音**（无需任何音频文件）；
3. 页面保持隐藏期间**标签页标题闪烁**（`(!) ` 前缀交替）。

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

如果只想热加载、不想重启：把下面这行插进 profile 补丁层
`~/.dsh/profiles/web/cordis.patch.yml` 即可（长驻进程自动热重载）：

```yaml
- insert:
    - id: ui-attention
      name: "dsh-ui-attention"
```

## 使用

- 打开 Web UI 的 **General 设置**：**通知与提醒** 行提供 4 个开关（通知 / 提示音 /
  标题闪烁 / 仅后台提醒）和一个 **发送测试通知** 按钮。
- 浏览器通知权限在你点击测试按钮时申请（浏览器只允许在用户手势中请求）。权限为
  `default` 时该行会显示启用提示，插件自动降级为 声音 + 标题闪烁。
- 按会话提醒：待处理交互首次出现（或其类型变化）且页面隐藏时提醒一次。刷新页面或
  重连不会重复提醒；交互解决后对应通知自动关闭、标题恢复。

## 设置项

持久化在宿主人设置文档的 `ui-attention` 命名空间（默认全部开启）：

| 字段 | 含义 |
| --- | --- |
| `enabled` | 总开关：关闭后弹窗、声音、标题闪烁全部静默 |
| `sound` | 播放 WebAudio 提示音 |
| `titleFlash` | 页面隐藏时标签页标题闪烁 |
| `onlyWhenHidden` | 仅页面不可见时提醒；关闭后前台也会提醒 |

## 常见问题

- **没有弹窗？** 在浏览器站点设置里允许通知，然后点一次测试按钮。权限被拒时自动降级
  为声音 + 标题提醒。
- **没有声音？** 浏览器自动播放策略要求先有一次用户手势；插件在首次点击/按键时解锁
  AudioContext，失败会在后续手势中重试。
- **开了多个标签页？** 每个标签页各自提醒（跨标签页无法去重），建议只保留一个 DSH
  标签页。
- **哪些事件会提醒？** 提问（`ask_user_question`）、计划审批（`plan-review` 意图）、
  以及工具/命令审批（`approval/requested`）。

## 开发

```sh
pnpm install
pnpm test        # vitest：T1-T13 TDD 套件 + 构建产物冒烟
pnpm bundle      # tsdown -> lib/index.js（宿主）+ lib/client.js（浏览器）
```

架构：`attention-engine.ts` 是对会话列表 `pendingInteraction` 状态的纯状态机（基线
播种、按 会话×状态 只提醒一次、仅后台门控）；`notifications.ts`、`beep.ts`、
`title-flash.ts` 是可注入的平台接线；`client/index.ts` 基于 `ctx.sessions.list`、
`ctx.settingsScope` 与 `settings.general.item` 槽位完成装配。宿主 node 侧注册
`ui-attention` 设置命名空间。

## 卸载

```sh
dsh plugin --profile web remove dsh-ui-attention
# 同时删除 ~/.dsh/profiles/web/cordis.patch.yml 中手工添加的 ui-attention insert 行
# 然后重启 dsh web
```

## License

MIT
