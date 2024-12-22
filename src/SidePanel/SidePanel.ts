import { Context } from "../Context";
import { Names } from "../Names";

export class LeftSidePanel {
  private tabButtons: NodeListOf<Element>;
  private sidePanel: HTMLElement;
  private sidePanelTitle: HTMLElement;
  private sidePanelContent: HTMLElement;

  private splitPaneDragger: HTMLElement;

  contentOnShow: "intro" | "filter" | "params" | undefined;

  constructor() {
    // 获取按钮和第二层侧边栏
    this.tabButtons = document.querySelectorAll(`.${Names.LeftPanel_TabButton}`);
    this.sidePanel =
      document.getElementById(Names.LeftPanel_SidePanel) ??
      (() => {
        throw new Error("侧边栏元素不存在");
      }).call(this);
    this.sidePanelTitle =
      document.getElementById(Names.LeftPanel_SidePanelTitle) ??
      (() => {
        throw new Error("侧边栏标题元素不存在");
      }).call(this);
    this.sidePanelContent =
      document.getElementById(Names.LeftPanel_SidePanelContent) ??
      (() => {
        throw new Error("侧边栏内容元素不存在");
      }).call(this);

    this.splitPaneDragger =
      document.getElementById(Names.LeftPanel_SplitPaneDragger) ??
      (() => {
        throw new Error("拖拽元素不存在");
      }).call(this);
  }

  changeToParamsView() {
    if (this.contentOnShow === "params") {
      return;
    }
    console.log("切换到参数视图");
    this.tabButtons.forEach((button) => {
      button.classList.remove("selected");
    });
    const btnParams =
      document.getElementById("btn-params") ??
      (() => {
        throw new Error("参数按钮元素不存在");
      }).call(this);
    btnParams.classList.add("selected");
    this.contentOnShow = "params";
    this.sidePanelTitle.innerText = "参数";
    this.sidePanelContent.innerHTML = "<p>这是参数内容。</p>";
    this.sidePanel.classList.remove("hidden");
  }

  public init() {
    // 监听按钮点击事件，切换内容或收起侧边栏
    this.tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        console.log("[LeftSidePanel] button clicked: ", button.id);
        // 如果点击的是当前已选中的按钮，收起侧边栏
        if (button.classList.contains("selected")) {
          this.sidePanel.classList.add("hidden");
          button.classList.remove("selected");
          this.contentOnShow = undefined;
        } else {
          // 先移除所有按钮的选中状态
          this.tabButtons.forEach((btn) => btn.classList.remove("selected"));
          // 设置当前按钮为选中状态
          button.classList.add("selected");

          // 根据按钮不同切换第二层侧边栏的内容
          if (button.id === "btn-intro") {
            this.sidePanelTitle.innerText = "介绍";
            const introContent = `
            <p class="intro-text">本项目旨在提供可交互的铁路信息可视化分析工具，侧重于分析站点间的最短距离和最短通行时间，以及站点和线路的新建或删除对铁路运行的影响。</p>
            <p class="intro-text">使用指南：</p>
            <ul class="intro-text">
              <li>缩放与平移</li>
              <ul class="intro-text">
                <li>鼠标滚轮滚动：放大或缩小视图。</li>
                <li>鼠标左键拖动：平移视图。</li>
                <li>双击鼠标左键：放大视图</li>
                <li>在地图视图下点击省份：聚焦到该省份。再次点击该省份可恢复正常视图。</li>
                <li>在地图视图下点击空白区域：恢复正常视图。</li>
              </ul>
              <li>一般交互（适用于所有视图）</li>
              <ul class="intro-text">
                <li>鼠标左键点击站点或线路：在左侧边栏“参数”中显示该站点或线路的属性信息。</li>
              </ul>
              <li>拓扑视图下的额外交互</li>
              <ul class="intro-text">
                <li>鼠标中键单击空白区域：添加节点。</li>
                <li>鼠标左键拖动节点：拖动节点。如果松开鼠标时光标指向另一个节点，则在两点间添加一条边。</li>
                <li>鼠标中键按住并拖动：删除光标经过的边和节点。一个节点只有在没有边连接时才能被删除。</li>
              </ul>
              <ul class="intro-text">
                <li>点击节点：显示该节点的属性信息。</li>
                <li>顶部按钮：用于切换视图。</li>
                <ul class="intro-text">
                  <li>地图视图：展示站点地理位置以及铁路连接情况。</li>
                  <li>距离拓扑：展示节点间的拓扑连接关系，图中边长与距离成正比。可以在此视图中交互地增删节点和边。</li>
                  <li>时间视图：图中边长与通行时间成正比，其余同距离拓扑视图。</li>
                </ul>
              </ul>
              <li>左侧边栏</li>
              <ul class="intro-text">
                <li>介绍：你正在读的这个东西。</li>
                <li>过滤器：用于筛选站点和线路。</li>
                <li>参数：用于显示并编辑站点或铁路路段信息。</li>
              </ul>
              <li>右侧边栏</li>
              <ul class="intro-text">
                <li>哦不，还没写。</li>
              </ul>
            </ul>
          `;
            this.sidePanelContent.innerHTML = introContent;
            this.contentOnShow = "intro";
          } else if (button.id === "btn-filter") {
            this.sidePanelTitle.innerText = "过滤器";
            this.sidePanelContent.innerHTML = "<p>这是过滤器内容。</p>";
            this.contentOnShow = "filter";
          } else if (button.id === "btn-params") {
            this.sidePanelTitle.innerText = "参数";
            this.sidePanelContent.innerHTML =
              "<p>在任意视图中点击选择点或边，以显示并编辑站点或铁路路段信息。</p>";
            this.contentOnShow = "params";
          }

          // 显示第二层侧边栏
          this.sidePanel.classList.remove("hidden");
        }
      });
    });

    // 监听拖拽事件，调整侧边栏宽度
    this.splitPaneDragger.addEventListener("mousedown", (e) => {
      // 阻止默认事件，防止选中内容
      e.preventDefault();

      // 获取初始鼠标位置和侧边栏的初始宽度
      const initialMouseX = e.clientX;
      const initialWidth = this.sidePanel.offsetWidth;

      // 拖拽过程中更新宽度
      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - initialMouseX - 20; // 计算鼠标的水平移动距离
        const newWidth = initialWidth + deltaX; // 更新宽度

        if (newWidth > 100 && newWidth < 600) {
          // 限制宽度范围
          this.sidePanel.style.width = newWidth + "px";
        }
      };

      // 停止拖拽
      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  }
}

export class RightSidePanel {
  private sidebar_ids = [
    { button_id: "sidebarButton1", sidebar_id: "sidebar1", dragger_id: "dragger1" },
    { button_id: "sidebarButton2", sidebar_id: "sidebar2", dragger_id: "dragger2" },
  ];
  private buttons: { button: HTMLElement; sidebar: HTMLElement }[];

  constructor() {
    this.buttons = [];
    this.sidebar_ids.forEach(({ button_id, sidebar_id, dragger_id }) => {
      const button =
        document.getElementById(button_id) ??
        (() => {
          throw new Error(`按钮${button_id}不存在`);
        }).call(this);
      const sidebar =
        document.getElementById(sidebar_id) ??
        (() => {
          throw new Error(`侧边栏${sidebar_id}不存在`);
        }).call(this);
      this.buttons.push({ button, sidebar });
    });

    this.buttons.forEach(({ button, sidebar }) => {
      button.addEventListener("click", () => {
        console.log(sidebar.style.display);
        sidebar.style.display = sidebar.style.display === "block" ? "none" : "block";
      });
    });
  }

  private addDraggable(draggerId: string, sidebarId: string) {
    const dragger =
      document.getElementById(draggerId) ??
      (() => {
        throw new Error(`拖拽元素${draggerId}不存在`);
      }).call(null);
    const sidebar =
      document.getElementById(sidebarId) ??
      (() => {
        throw new Error(`侧边栏${sidebarId}不存在`);
      }).call(null);

    let isDragging = false;
    let startY: number;
    let startTop: number;

    dragger.addEventListener("mousedown", (e) => {
      isDragging = true;
      startY = e.clientY;
      startTop = parseInt(window.getComputedStyle(sidebar).top, 10);
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const deltaY = e.clientY - startY;
      const newTop = startTop + deltaY;
      sidebar.style.top = `${newTop}px`;
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });
  }

  public init() {
    // 为每个侧边栏添加拖拽事件
    this.sidebar_ids.forEach(({ button_id, sidebar_id, dragger_id }) => {
      this.addDraggable(dragger_id, sidebar_id);
    });
  }
}

export class TopSidePanel {
  private buttons_ids = ["btn-map-view", "btn-distance-view", "btn-time-view"];

  private buttons: Map<string, HTMLElement>;

  constructor(private ctx: Context) {
    this.buttons = new Map();
    this.buttons_ids.forEach((button_id) => {
      const button =
        document.getElementById(button_id) ??
        (() => {
          throw new Error(`按钮${button_id}不存在`);
        }).call(this);
      this.buttons.set(button_id, button);
    });
  }

  public init() {
    this.buttons.forEach((button, button_id) => {
      if (button_id === "btn-map-view") {
        button.addEventListener("click", () => {
          console.log("切换到地图视图");
          this.ctx.onVievChange("map");
        });
      } else if (button_id === "btn-distance-view") {
        button.addEventListener("click", () => {
          console.log("切换到地图视图");
          this.ctx.onVievChange("distance");
        });
      } else if (button_id === "btn-time-view") {
        button.addEventListener("click", () => {
          console.log("切换到时间视图");
          this.ctx.onVievChange("time");
        });
      }
    });
  }
}
