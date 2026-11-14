# ST-Folio（预设书页）

一个独立的 SillyTavern 前端扩展，只用来整理「AI 回复配置」里的预设面板。
纯原生 DOM 实现，不替换任何原生 `<select>`，不改写酒馆的数据流。

视觉参考同目录的 **ST-Archive**：暗红细边框、宋体/等宽混排、半透明底色，亮色与暗色主题都能自适应。ST-Archive 未被修改。

## 功能

1. **滑动条防误触锁**
   在「参数调整」标题栏注入锁图标。锁定后，预设面板内所有原生 range 滑块的滚轮、触摸、触控笔输入都会被拦截，鼠标仍可正常拖动；状态写入 `localStorage`，刷新后保持。

2. **四大模块点击折叠**
   顶端「预设 / PRESET」（显示当前预设名）、「参数调整 / PARAMETERS」、「高级选项 / ADVANCED」、「预设条目 / PRESET ENTRIES」全部改为点击标题栏折叠。折叠只给现有容器加 class，节点与原生事件全部保留。

3. **主题化外观**
   所有样式都限定在 `#left-nav-panel` 与 `.stf-*` 命名空间内，颜色取自 `--SmartThemeBodyColor` / `--SmartThemeBorderColor` / `--SmartThemeBlurTintColor`。

## 安装方法

### 方法一：酒馆一键安装（推荐）
1. 打开SillyTavern，点击顶部菜单的**“扩展”**。
2. 点击 **Install Extension**（安装扩展）。
3. 粘贴本仓库的链接，点击确认即可。

### 方法二：手动安装
将本仓库的 `manifest.json`、`index.js`、`style.css` 放入酒馆的 `public/scripts/extensions/third-party/ST-Folio` 目录下，重启酒馆。

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
