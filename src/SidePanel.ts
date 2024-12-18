import { Context } from "./Context";

export class LeftSidePanel {
  private tabButtons: NodeListOf<Element>;
  private sidePanel: HTMLElement;
  private sidePanelTitle: HTMLElement;
  private sidePanelContent: HTMLElement;

  private splitPaneDragger: HTMLElement;

  constructor() {
    // 获取按钮和第二层侧边栏
    this.tabButtons = document.querySelectorAll(".tabButton");
    this.sidePanel =
      document.getElementById("sidePanel") ??
      (() => {
        throw new Error("侧边栏元素不存在");
      }).call(this);
    this.sidePanelTitle =
      document.getElementById("sidePanelTitle") ??
      (() => {
        throw new Error("侧边栏标题元素不存在");
      }).call(this);
    this.sidePanelContent =
      document.getElementById("sidePanelContent") ??
      (() => {
        throw new Error("侧边栏内容元素不存在");
      }).call(this);

    this.splitPaneDragger =
      document.getElementById("splitPaneDragger") ??
      (() => {
        throw new Error("拖拽元素不存在");
      }).call(this);
  }
  public init() {
    // 监听按钮点击事件，切换内容或收起侧边栏
    this.tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        // 如果点击的是当前已选中的按钮，收起侧边栏
        if (button.classList.contains("selected")) {
          this.sidePanel.classList.add("hidden");
          button.classList.remove("selected");
        } else {
          // 先移除所有按钮的选中状态
          this.tabButtons.forEach((btn) => btn.classList.remove("selected"));
          // 设置当前按钮为选中状态
          button.classList.add("selected");

          // 根据按钮不同切换第二层侧边栏的内容
          if (button.id === "btn-intro") {
            this.sidePanelTitle.innerText = "介绍";
            this.sidePanelContent.innerHTML = "<p>这是介绍内容。</p>";
          } else if (button.id === "btn-filter") {
            this.sidePanelTitle.innerText = "过滤器";
            this.sidePanelContent.innerHTML = "<p>这是过滤器内容。</p>";
          } else if (button.id === "btn-params") {
            this.sidePanelTitle.innerText = "参数";
            this.sidePanelContent.innerHTML = "<p>这是参数内容。</p>";
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
    { button_id: "sidebarButton3", sidebar_id: "sidebar3", dragger_id: "dragger3" },
    { button_id: "sidebarButton4", sidebar_id: "sidebar4", dragger_id: "dragger4" },
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
          this.changeToMapView();
        });
      } else if (button_id === "btn-distance-view") {
        button.addEventListener("click", () => {
          this.changeToDistanceView();
        });
      } else if (button_id === "btn-time-view") {
        button.addEventListener("click", () => {
          this.changeToTimeView();
        });
      }
    });
  }

  private changeToMapView() {
    console.log("切换到地图视图");
    this.ctx.renderMap();
  }

  private changeToDistanceView() {
    console.log("切换到距离视图");
    this.ctx.renderGraph("distance");
  }

  private changeToTimeView() {
    console.log("切换到时间视图");
    this.ctx.renderGraph("time");
  }
}