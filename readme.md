# 运行方式：

在**项目文件夹**下（即 vite.config.js 所在的文件夹），运行以下命令：npx vite

# 项目说明：

主要功能实现见 TODO 文件。

结构：

- 项目总管理器是 Context。其中：
  - SidePanel 负责为三个侧边栏添加切换等逻辑。
  - MapContext 负责地图绘制、缩放（以及交互）、投影
  - GraphContext 负责图拓扑管理。其中：
    - Graph 是图的抽象存储器。
    - Simulator 是力模拟器，同时负责绘制。
- index.html 负责页面布局，包括侧边栏、地图、图形。
- css 文件夹存放样式文件。
- data 文件夹存放数据文件。


