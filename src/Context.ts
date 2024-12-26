import * as d3 from "d3";

import { Data } from "./Global/Data";
import { GraphContext } from "./GraphView/GraphContext";
import { MapContext } from "./MapView/MapContext";
import { ParamsExplorer } from "./SidePanel/ParamsExplorer";
import { ShortestPath } from "./ShortestPath";
import { LeftSidePanel, RightSidePanel, TopSidePanel } from "./SidePanel/SidePanel";
import { DensityCurve } from "./SidePanel/DensityCurve";
import { HeatMap } from "./SidePanel/HeatMap";
import { Choosed, Path } from "./Global/Choosed";
import { Graph } from "./GraphView/Basic/Graph";
import { LegendContext } from "./Legends/LegendsContext";

export class Context {
  data: Data;
  choosed: Choosed;
  private paramsExporer: ParamsExplorer;
  private legendContext: LegendContext;

  private mapContext: MapContext;
  private graphContext: GraphContext;

  private leftSidePanel: LeftSidePanel;
  private rightSidePanel: RightSidePanel;
  private topSidePanel: TopSidePanel;

  public shortestPath!: ShortestPath;

  private densityCurve!: DensityCurve;
  private heatMap!: HeatMap;

  private currentModel: "distance" | "time" = "distance"; // 默认显示距离模型
  private currentView: "map" | "distance" | "time" = "map"; // 默认显示地图视图

  constructor() {
    this.data = new Data();
    this.choosed = new Choosed(this);
    this.paramsExporer = new ParamsExplorer(this, this.data);
    this.legendContext = new LegendContext(this, "svg");

    this.mapContext = new MapContext(this);
    this.graphContext = new GraphContext(this, this.mapContext.zoom, this.mapContext.projection);

    this.leftSidePanel = new LeftSidePanel(this);
    this.rightSidePanel = new RightSidePanel();
    this.topSidePanel = new TopSidePanel(this);

    window.onload = () => {
      this.leftSidePanel.init();
      this.rightSidePanel.init();
      this.topSidePanel.init();
    };

    Promise.resolve(
      this.data.load().then(() => {
        this.mapContext.render();

        this.shortestPath = new ShortestPath(this.data);
        this.shortestPath.init();
        this.shortestPath.calcAll();

        this.densityCurve = new DensityCurve(d3.select("#densityChart"), this.shortestPath); // 创建 DensityCurve 实例并绘制
        this.heatMap = new HeatMap(this, d3.select("#heatMap"), this.shortestPath); // 创建 HeatMap 实例并绘制
        // this.densityCurve.render(0); // 渲染第 0 个参数的密度曲线图
        // this.heatMap.render(0); // 渲染第 0 个参数的热力图
      })
    ).then(() => {
      this.fix();
    });

    this.legendContext.render();
  }

  async fix() {
    // FIXME: 哦我的天哪。建议你不要尝试动这块代码，不要删掉任何一个await，虽然这看起来完全不需要同步。
    await this.graphContext.clear();
    await this.graphContext.init("distance");
    await this.graphContext.render();

    await this.shortestPath.clear();
    await this.shortestPath.init();
    await this.shortestPath.calcAll();

    await this.densityCurve.render(0);
    await this.heatMap.clear();
    await this.heatMap.render(0);

    await this.mapContext.clear();
    await this.graphContext.clear();
    await this.mapContext.init();
    await this.mapContext.render();
  }

  onViewChange(view: "map" | "distance" | "time"): void {
    this.currentView = view;
    if (view === "map") {
      this.renderMap();
    } else if (view === "distance") {
      this.currentModel = view;
      // this.rerenderDensityCurve();
      this.renderGraph("distance");
    } else if (view === "time") {
      this.currentModel = view;
      // this.rerenderDensityCurve();
      this.renderGraph("time");
    }
  }

  onParamChange(itemId: string): void {
    console.log("[Context] onParamChange");
    if (this.currentView === "map") this.rerenderMap(itemId);
    this.recalculateShortestPath();
    this.rerenderDensityCurve();
    this.rerenderHeatMap();
  }

  onChoosedNodeFirstChange(oldNodeId: string | null, newNodeId: string | null): void {
    console.log("[Context] onChoosedNodeFirstChange", oldNodeId, newNodeId);
    if (newNodeId) this.exploreParams(newNodeId);
    if (this.currentView === "map") this.mapContext.onNodeFirstChange(oldNodeId, newNodeId); // TODO
    if (this.currentView === "distance" || this.currentView === "time")
      this.graphContext.onNodeFirstChange(oldNodeId, newNodeId);
  }

  onChoosedNodeSecondChange(oldNodeId: string | null, newNodeId: string | null): void {
    console.log("[Context] onChoosedNodeSecondChange", oldNodeId, newNodeId);
    if (newNodeId) this.exploreParams(newNodeId);
    if (this.currentView === "map") this.mapContext.onNodeSecondChange(oldNodeId, newNodeId);
    if (this.currentView === "distance" || this.currentView === "time")
      this.graphContext.onNodeSecondChange(oldNodeId, newNodeId);
  }

  onChoosedEdgeChange(oldEdgeId: string | null, newEdgeId: string | null): void {
    console.log("[Context] onChoosedEdgeChange", oldEdgeId, newEdgeId);
    if (newEdgeId) this.exploreParams(newEdgeId);
  }

  onChoosedPathChange(oldPath: Path | null, newPath: Path | null) {
    console.log("[Context] onChoosedPathChange", oldPath, newPath);
    this.heatMap.clearHighlight();
    if (this.currentView === "time" || this.currentView === "distance")
      this.graphContext.clearTrainLine();
    if (newPath) {
      const pathId = newPath.id;
      const start = Graph.getSourceId(pathId);
      const end = Graph.getTargetId(pathId);
      this.heatMap.highlightCell(start, end);
      if (this.currentView === "time" || this.currentView === "distance")
        this.graphContext.renderShorestPath(newPath);
    }
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

  exploreParams(id?: string): void {
    if (this.leftSidePanel.contentOnShow !== "params") this.leftSidePanel.changeToParamsView();
    this.paramsExporer.explore(id);
  }

  private recalculateShortestPath(): void {
    this.shortestPath.clear();
    this.shortestPath.init();
    this.shortestPath.calcAll();
  }

  private rerenderMap(itemId: string): void {
    this.mapContext.rerender(itemId);
  }

  private rerenderHeatMap(): void {
    this.heatMap.clear();
    this.heatMap.render(0);
  }

  rerenderDensityCurve(): void {
    const paramId = this.currentModel === "distance" ? 0 : 1;
    this.densityCurve.render(paramId);
  }

  filter(
    filterKind: "node-color" | "edge-color" | "node-width" | "edge-width",
    range: [number, number]
  ): void {
    console.log("[Context] filter", filterKind, range);
    const [min, max] = range;
    if (this.currentView === "map") this.mapContext.filter(filterKind, min, max);
  }
}

(window as any).ctx = new Context();
