# react-bottom-fixed 接入记录

通过 `pnpm add react-bottom-fixed` 安装 **0.2.0**，许可证 MIT。检查了已安装包的 ESM 实现、CSS 和类型；公开说明见 [项目仓库](https://github.com/almond-bongbong/react-bottom-fixed)。

## 实际行为

- 导出 `BottomFixed`，接收 `children`、`className` 和 `scrollBehavior`；本项目使用默认 `fade-out` 行为，但覆盖其隐藏样式，让正在编辑的输入栏保持可见。
- 键盘处理只在 iPhone / iPad / iPod 或具备多点触控的 MacIntel 平台启用，监听 `visualViewport`、焦点与触摸事件，通过内联 `transform` 上移容器。
- 包内 CSS 无条件使用 `position: fixed; bottom: 0`，因此非 iOS 平台也需要明确覆盖定位方式，不能只依赖说明中的“普通容器”描述。
- 组件没有高度占位能力；也没有用于关闭键盘位移的属性。

## 本项目的适配

`src/components/ComposerDock.tsx` 包装实际输入表单。在 iOS 上通过 Portal 放到 `body`，让 `BottomFixed` 相对于布局视口定位，避免被高度已缩小的实验台裁切或重复上移；用 ResizeObserver 同步对话列的横坐标、宽度以及输入表单占位高度。其他平台保留正常文档流，由实验台的可见视口布局处理输入区域。

保留整个表单的焦点与发送操作，不在主题切换、键盘 resize 或对话更新时重建输入框。覆盖组件默认的淡出和位移过渡样式，避免拖动阅读、选择文本时输入栏消失，或键盘位移与布局调整产生不同步动画。

## 验证边界

生产构建通过；Chromium 中模拟 iPhone 平台及键盘高度，确认独立位移、占位与提交路径。没有以此声称已经验证 iOS Safari 的真实键盘动画、地址栏收起、横竖屏切换、输入法候选栏或辅助功能键盘。后续优先在真机上验证这些行为，详见 [验证记录](VALIDATION.md)。
