# dsh-ui-attention

仓库：https://github.com/LeeKai233/dsh-ui-attention · npm：https://www.npmjs.com/package/dsh-ui-attention

![npm version](https://img.shields.io/npm/v/dsh-ui-attention) ![license](https://img.shields.io/npm/l/dsh-ui-attention) [![鲸选模板](https://raw.githubusercontent.com/LeeKai233/dsh-whale-picks/main/assets/template-badge.svg)](https://github.com/LeeKai233/dsh-whale-picks/tree/main/templates/plugin)

DSH Web 操作提醒：页面不在前台时，把需要你处理的事情送到你眼前。

## 它做什么

- 提问、计划审批、工具审批出现时，发浏览器通知、播放提示音、闪烁标签页标题。
- 任何会话回合结束时，同样提醒，正文包含会话标题。
- 点击通知，直接打开对应会话。
- 提醒完全在浏览器本地合成。不发送任何网络请求，不改变会话行为。

## 截图

设置界面：

![设置界面](assets/%E8%AE%BE%E7%BD%AE%E7%95%8C%E9%9D%A2.png)

通知样式：

![通知样式](assets/%E9%80%9A%E7%9F%A5%E6%A0%B7%E5%BC%8F.png)

## 安装

```sh
dsh plugin --profile web add dsh-ui-attention
dsh web
```

卸载：

```sh
dsh plugin --profile web remove dsh-ui-attention
```

不要在 profile 补丁层手工插入 `ui-attention` 行，否则启动会报 duplicate loader entry id。

## 提醒时机

| 页面状态 | 行为 |
| --- | --- |
| 不在前台：标签页隐藏、窗口最小化、被其它应用覆盖 | 所有事件都提醒 |
| 在前台且聚焦 | 当前会话安静；其它会话的事件仍然提醒 |

刷新页面不会重复提醒。同一回合只提醒一次。

## 设置

五个开关，保存在浏览器本地，默认全部开启。

| 开关 | 含义 |
| --- | --- |
| 通知 | 总开关 |
| 提示音 | 播放提示音 |
| 标题闪烁 | 有待处理交互时闪烁标签页标题 |
| 仅后台提醒 | 只约束当前会话：前台时安静；其它会话始终提醒 |
| 回合完成提醒 | 会话回合结束时提醒 |

## 常见问题

- 没有弹窗：在浏览器里允许本站通知，然后点一次「发送测试通知」。
- 没有声音：浏览器要求先有一次用户操作；插件在首次点击或按键后解锁声音。
- 多标签页：每个标签页各自提醒，建议只保留一个。
- 哪些事件：提问、计划审批、工具审批、回合完成。

## 鲸选

本插件基于鲸选插件模板构建，并通过鲸选商店门槛校验。

- 鲸选商店：https://github.com/LeeKai233/dsh-whale-picks
- 插件模板：https://github.com/LeeKai233/dsh-whale-picks/tree/main/templates/plugin
- 开发者文档：[docs/DEVELOPMENT.zh.md](docs/DEVELOPMENT.zh.md)

## License

MIT
