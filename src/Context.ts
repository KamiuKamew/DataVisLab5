import * as d3 from "d3";

import { Data } from "./Data";
import { GraphContext } from "./Graph/GraphContext";
import { MapContext } from "./MapContext";
import { ParamsExplorer } from "./ParamsExplorer";
import { ShortestPath } from "./ShortestPath";
import { LeftSidePanel, RightSidePanel, TopSidePanel } from "./SidePanel";
import { DensityCurve } from "./DensityCurve";
import { HeatMap } from "./HeatMap";

export class Context {
  data: Data;
  private paramsExporer: ParamsExplorer;

  private mapContext: MapContext;
  private graphContext: GraphContext;

  private leftSidePanel: LeftSidePanel;
  private rightSidePanel: RightSidePanel;
  private topSidePanel: TopSidePanel;

  private shortestPath!: ShortestPath;

  private densityCurve!: DensityCurve;
  private heatMap!: HeatMap;

  private currentModel: "distance" | "time" = "distance"; // 默认显示距离模型

  constructor() {
    this.data = new Data();
    this.paramsExporer = new ParamsExplorer(this, this.data);

    this.mapContext = new MapContext(this);
    this.graphContext = new GraphContext(this, this.mapContext.zoom, this.mapContext.projection);

    this.leftSidePanel = new LeftSidePanel();
    this.rightSidePanel = new RightSidePanel();
    this.topSidePanel = new TopSidePanel(this);

    window.onload = () => {
      this.leftSidePanel.init();
      this.rightSidePanel.init();
      this.topSidePanel.init();
    };

    this.data.load().then(() => {
      this.mapContext.render();

      this.shortestPath = new ShortestPath(this.data);
      this.shortestPath.init();
      this.shortestPath.calcAll();

      this.densityCurve = new DensityCurve(d3.select("#densityChart"), this.shortestPath); // 创建 DensityCurve 实例并绘制
      this.densityCurve.render(0); // 渲染第 0 个参数的密度曲线图
      this.heatMap = new HeatMap(d3.select("#heatMap"), this.shortestPath); // 创建 HeatMap 实例并绘制
      this.heatMap.render(0); // 渲染第 0 个参数的热力图
    });
  }

  onVievChange(view: "map" | "distance" | "time"): void {
    if (view === "map") {
      this.renderMap();
    } else if (view === "distance") {
      this.currentModel = view;
      this.rerenderDensityCurve();
      this.renderGraph("distance");
    } else if (view === "time") {
      this.currentModel = view;
      this.rerenderDensityCurve();
      this.renderGraph("time");
    }
  }

  onParamChange(itemId: string): void {
    console.log("[Context] onParamChange");
    this.rerenderMap(itemId);
    this.recalculateShortestPath();
    this.rerenderDensityCurve();
  }

  private renderMap(): void {
    this.mapContext.clear();
    this.graphContext.clear();
    this.mapContext.init();
    this.mapContext.render();
  }

  private renderGraph(model: "distance" | "time"): void {
    this.mapContext.clear();
    this.graphContext.clear();
    this.graphContext.init(model);
    this.graphContext.render();
  }

  exploreParams(dataCategory: string, id?: string): void {
    if (this.leftSidePanel.contentOnShow !== "params") this.leftSidePanel.changeToParamsView();
    this.paramsExporer.explore(dataCategory, id);
  }

  private recalculateShortestPath(): void {
    this.shortestPath.clear();
    this.shortestPath.init();
    this.shortestPath.calcAll();
  }

  private rerenderMap(itemId: string): void {
    this.mapContext.rerender(itemId);
  }

  rerenderDensityCurve(): void {
    this.densityCurve.clear();
    const paramId = this.currentModel === "distance" ? 0 : 1;
    this.densityCurve.render(paramId);
  }
}

const ctx = new Context();
