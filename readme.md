# 运行方式：

在**项目文件夹**下（即 vite.config.js 所在的文件夹），运行以下命令：npx vite

# 项目说明：

### 项目逻辑实现简介：

#### 参数管理：ParamsExplorer

1. 实现参数的获取、设置、保存、加载等功能。
2. 利用 typescript 的类型检查功能，实现校验功能。

#### 项目总管理器：Context

1. 包含 paramsExplorer 参数管理器，mapContext 地图管理器，graphContext 图管理器，以及侧边栏管理器。
2. 实现三个模块的创建逻辑。
3. 实现三个模块的更新逻辑。

#### 侧边栏：SidePanel

1. 分 LeftSidePanel，RightSidePanel，TopSidePanel 三个模块。
2. 在 topSidePanel 模块中，实现了地图视角，距离视角和时间视角的切换。
3. 在 leftSidePanel 模块中，实现了内容的切换和侧边栏宽度的调整。
4. 在 rightSidePanel 模块中，实现了对侧边栏的拖拽效果。

#### 地图：MapContext

1. 实现了点击事件进行地图的缩放，以及地图的渲染。
2. 实现了节点和连边之间的绘制。
3. 实现了手动更改节点之间的数值，颜色等属性。

#### 图形：Graph（针对力引导图）

1. 在 graphContext 模块中，实现了节点距离的计算逻辑。
2. 在 CanvasEventAnalyst 模块中，实现了鼠标松开，移动等逻辑。
3. 在 sitimulor 模块中，实现了力学仿真的所有模拟逻辑。
