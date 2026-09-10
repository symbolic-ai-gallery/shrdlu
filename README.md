# SHRDLU · Blocks World Laboratory

一个可在浏览器离线推理的 SHRDLU 现代复刻：React 工作台、Three.js 积木世界、英文符号语言引擎，以及中文输入适配。

**完成了原始演示 43 轮英文及对应中文的可执行流程和回归检查；这不等于原版所有英文表达的完全兼容，也不是 MacLisp 的忠实移植。** 几何布局、部分关系查询的结果、生成措辞以及开放式语言的覆盖范围仍有差异，见 [兼容性说明](documents/COMPATIBILITY.md)。历史回答只出现在原版资料面板，不会作为运行时回答。

## 运行

使用 Volta 固定 Node.js `24.19.0`，使用 pnpm `11.23.0`。固定版本已写入 `package.json` 的 `volta` 与 `packageManager`。

```sh
volta install node@24.19.0
volta install pnpm@11.23.0
pnpm install --frozen-lockfile
pnpm dev
```

若旧版 Volta 提示不支持 pnpm，可先按 Volta 提示启用其 pnpm 支持（`VOLTA_FEATURE_PNPM=1`），或使用已安装的 pnpm 11.23.0。

Vite 默认地址为 `http://127.0.0.1:5173`（背景知识入口页）；实验工作台为 `http://127.0.0.1:5173/#/lab`。端口占用时以控制台打印的地址为准。使用 hash 路由，部署为普通静态文件也可直接打开实验。

```sh
pnpm test       # 引擎与动作回归，包括中英文各 43 轮
pnpm audit      # 按顺序记录 43 轮的原版回答和实际回答
pnpm build      # 生成语言引擎 → 严格 TypeScript 检查 → 生产构建
pnpm preview    # 预览生产构建
pnpm format    # 格式化应用源码，保留上游源码格式
```

本项目只生成静态文件 `docs/`，无后端、数据库、模型服务或 API Key。首次安装需要网络；运行时所有 XML、脚本和图形资源均从本应用加载。Web Worker 中运行语言与规划引擎，界面线程绘制三维世界。支持现代浏览器的 WebGL；WebGL 不可用时仍可使用对话与物体列表。

`documents/` 保存说明文档与兼容性审计；`docs/` 专用于构建产物，每次构建会重新生成。资源采用相对路径，可将 `docs` 作为静态站点根目录，或托管在项目子路径下。尚未执行线上发布。

## 使用

- 入口页和实验台右上角的太阳／月亮按钮切换明暗主题。首次访问跟随系统，手动选择保存在本地；刷新及页面切换保持一致，切换主题不重置世界。
- 手机端在可见视口内分配世界、对话和输入框，仅对话记录滚动。桌面端为世界与对话双栏。背景资料集中在入口页。
- 输入 `Pick up a big red block.` 或 `拿起一个大的红色积木块。`
- 常见同义表达可以组合使用，例如 `Could you grab the azure brick?`、`请帮我抓起那块蓝色积木`、`红色立方块放到桌面上`。
- 继续输入 `Put it in the box.`，观察机械臂和世界状态。
- 查询颜色、数量、存在性、包含关系、支撑关系、位置和大小比较；支持“盒子里的蓝色积木”一类关系描述。
- 不明确的物体描述会请求澄清，例如 `Grasp the pyramid.` → `the blue pyramid`。
- 对大物体的操作会先清理其上方的物体；非法堆叠会拒绝，失败计划不会改变世界。
- 定义 `A crown is a stack that contains two red blocks and a green pyramid.`，然后 `Build a crown.`。
- 可命名物体：`Call the red cube Ruby.` → `Pick up Ruby.`。
- “更多操作”菜单提供物体列表、语言、显示设置、导出、自动演示和重置。“示例”弹窗可填入指令，展开原版对话后可以逐句运行。
- 拖动旋转、滚轮或双指缩放、点击物体检查；相机菜单也提供旋转、缩放和复位按钮。动作执行时可暂停、继续或调整速度。
- 输入框 Enter 换行，Ctrl / ⌘ + Enter 或发送按钮提交；支持中文输入法组合输入。
- 底部输入栏使用 `react-bottom-fixed`。iOS 由独立的底部容器响应键盘位移，对话区保留相同高度，避免与可见视口布局重复上移；其他平台使用普通布局。技术考察与真机验证边界见 [底部输入栏说明](documents/BOTTOM_FIXED.md)。
- 中文通过经典句子对照与组合句式转换成规范英文。支持把／将字句、普通宾语句、位置前置句、礼貌前后缀及常见动词、量词和物体别称。中文界面优先显示可用的中文回答，英文原文按需展开；没有中文译文时显示英文。

## 技术栈与结构

- Volta + pnpm（含锁文件）
- React 19 + Vite 7 + TypeScript 5（应用代码严格类型检查）
- Tailwind CSS 4 + Base UI Button / Menu / Dialog
- Three.js + OrbitControls
- Vitest + esbuild；无 LLM 依赖

```text
src/
  Landing.tsx                专业背景知识入口页
  App.tsx                    实验台、对话、历史资料与物体检查
  components/WorldView.tsx   Three.js 场景、机械臂、选择与相机
  engine/
    grounded.ts              实时指代、空间查询、规划、概念与行为历史
    chinese.ts               中文词组与句式转换
    language.ts              英文规范化、礼貌包装与领域同义词
    classic.json             用户提供资料中的 43 轮中英文记录
    worker.ts                推理工作线程、时间预算与消息协议
    useEngine.ts             React 生命周期、重置、超时和状态同步
    webmcp.ts                可选浏览器工具接口
scripts/
  build-engine.mjs           将上游全局 TS 文件打包为隔离 ESM 模块
  engine-bridge.ts           XML 适配与共享世界边界
  audit-engine.mjs           历史对话审计
vendor/shrdlu/               上游引擎源码、许可证及固定提交信息
public/engine/               本体、英语语法规则与积木世界知识库
```

优先由新增的有限领域解释器处理支持的表达，所有答案读取实时状态，所有规划生成世界状态序列；其他英文交给上游自然语言引擎。两者使用同一个世界，通过明确的快照边界同步。领域规划器输出接近、下降、夹紧、抬升、搬运、放下、松开、收回八类动作阶段。Worker 等待渲染器确认当前阶段完成后再推进，避免后来的逻辑状态覆盖尚未播放的动作。机械臂采用双连杆逆运动学、夹爪开合和带缓动的搬运弧线，持有物体与夹爪同步移动。渲染插值只影响显示，不更改逻辑坐标。

## 资料与授权

依据用户提供的原始存档网页、中文翻译、`参考实现.md` 和 MacLisp `blockp.txt` / `blurb.txt`。未将私人文献目录整体复制到仓库。

- [Terry Winograd 的 SHRDLU 原始主页](https://hci.stanford.edu/winograd/shrdlu/)
- [Santi Ontañón 的 TypeScript 实现](https://github.com/santiontanon/SHRDLU)，固定提交见 [UPSTREAM.md](vendor/shrdlu/UPSTREAM.md)，Apache-2.0
- [第三方声明](THIRD_PARTY_NOTICES.md)

上游经典积木引擎包含一个动作结束时清空 handler 后再次读取 handler 的空引用错误；本仓库保留完成的 handler 再进行检查，修改位置和原因见第三方声明。上游源码独立保存，不以关闭应用 TypeScript 检查的方式混入现代 React 代码。

验证情况与尚未测试的项目见 [VALIDATION.md](documents/VALIDATION.md)。
