# ST-Folio（预设书页）

一个独立的 SillyTavern 前端扩展，只用来整理「AI 回复配置」里的预设面板。
纯原生 DOM 实现，不替换任何原生 `<select>`，不改写酒馆的数据流。

视觉参考同目录的 **ST-Archive**：暗红细边框、宋体/等宽混排、半透明底色，亮色与暗色主题都能自适应。ST-Archive 未被修改。

## 功能

1. **滑动条防误触锁**
   在「参数调整」标题栏注入锁图标。锁定后，预设面板内所有原生 range 滑块的滚轮、触摸、触控笔输入都会被拦截，鼠标仍可正常拖动；状态写入 `localStorage`，刷新后保持。

2. **四大模块点击折叠**
   顶端「预设 / PRESET」（显示当前预设名）、「参数调整 / PARAMETERS」、「高级选项 / ADVANCED」、「预设条目 / PRESET ENTRIES」全部改为点击标题栏折叠。折叠只给现有容器加 class，节点与原生事件全部保留。

3. **顶部提示归位**
   酒馆自带的「单击滑块以手动输入值」提示和采样说明「?」图标原本相对面板绝对定位，面板内容滚动后仍悬浮在视口上方。现在它们被收进面板顶部的普通内容行，随面板一起滚动，不再遮挡预设条目。

4. **主题化外观**
   所有样式都限定在 `#left-nav-panel` 与 `.stf-*` 命名空间内，颜色取自 `--SmartThemeBodyColor` / `--SmartThemeBorderColor` / `--SmartThemeBlurTintColor`。

## 安装

将本目录放入：

```
public/scripts/extensions/third-party/ST-Folio/
```

确认存在 `manifest.json`、`index.js`、`style.css`、`README.md`，然后在酒馆「扩展」里启用 **ST-Folio (预设书页)**，刷新页面。

## 兼容性

- 针对 SillyTavern 1.19.0 的 DOM 结构编写。
- 找不到锚点时会静默跳过对应模块，不影响酒馆本身。
- 不依赖任何第三方库；只使用酒馆已加载的 Font Awesome 图标。

## 本地状态

| 键 | 内容 |
| --- | --- |
| `st_folio_state_v1` | 四个模块的折叠状态、滑动条锁定状态 |

不写入服务器设置，不产生跨设备同步数据。

## 已知边界

- 文本补全类 API 的采样器原生位于「高级选项」区块内，因此折叠归属跟随原生层级，不强行搬动。

## License

MIT
