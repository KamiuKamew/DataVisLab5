# 运行方式：

在**项目文件夹**下（即 vite.config.js 所在的文件夹），运行以下命令：npx vite

# 项目说明：

**我们的项目全称使用面向对象编程，具有极高的可读性和拓展性**

### 项目逻辑实现简介：

#### 参数管理：ParamsExplorer
1. 实现参数的获取、设置、保存、加载等功能。
2. 利用typescript的类型检查功能，实现校验功能。

#### 项目总管理器：Context
1. 包含paramsExplorer参数管理器，mapContext地图管理器，graphContext图管理器，以及侧边栏管理器。
2. 实现三个模块的创建逻辑。
3. 实现三个模块的更新逻辑。

#### 侧边栏：SidePanel
1. 分LeftSidePanel，RightSidePanel，TopSidePanel三个模块。
2. 在topSidePanel模块中，实现了地图视角，距离视角和时间视角的切换。
3. 在leftSidePanel模块中，实现了内容的切换和侧边栏宽度的调整。
4. 在rightSidePanel模块中，实现了对侧边栏的拖拽效果。

#### 地图：MapContext
1. 实现了点击事件进行地图的缩放，以及地图的渲染。
2. 实现了节点和连边之间的绘制。
3. 实现了手动更改节点之间的数值，颜色等属性。

#### 图形：Graph（针对力引导图）
1. 在graphContext模块中，实现了节点距离的计算逻辑。
2. 在CanvasEventAnalyst模块中，实现了鼠标松开，移动等逻辑。
3. 在sitimulor模块中，**手动使用d3，实现了力学仿真的所有模拟逻辑**。



