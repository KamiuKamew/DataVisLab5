import * as d3 from "d3";
import { Context } from "../Context";
import { GraphEventManager } from "./Basic/EventManager";
import { Graph } from "./Basic/Graph";
import { CanvasEventManager } from "./Renderer/EventManager";
import { CanvasEventAnalyst } from "./Renderer/EventAnalyst";
import { ForceSimulator } from "./Renderer/Simulator";
import { Path } from "../Global/Choosed";

export class GraphContext {
  private svg: d3.Selection<any, any, any, any>;
  private g: d3.Selection<any, any, any, any>;

  private graph: Graph;

  private graphEventManager: GraphEventManager;
  private canvasEventManager: CanvasEventManager;
  private canvasEventAnalyst: CanvasEventAnalyst;

  private simulator: ForceSimulator | null;
  private model: "distance" | "time" | null;

  private isiniting: boolean = false;

  constructor(
    private ctx: Context,
    private zoom: d3.ZoomBehavior<SVGSVGElement, unknown>,
    private projection: d3.GeoProjection
  ) {
    this.svg = d3.select("svg");
    this.g = this.svg.select("g");

    this.graphEventManager = new GraphEventManager();
    this.canvasEventManager = new CanvasEventManager(this.svg.node());

    this.graph = new Graph(this, this.graphEventManager, this.g.node());

    this.canvasEventAnalyst = new CanvasEventAnalyst(
      this.canvasEventManager,
      this.graph,
      this.svg.node()
    );

    this.simulator = null;
    this.model = null;

    this.registerCallbacks(this.graphEventManager);

    console.log(`[${this.constructor.name}] Constructed.`);
  }

  calculateDistance(sourceId: string, targetId: string): number {
    const nodes = this.ctx.data.nodes();
    const src_pos = nodes[sourceId]["geo_info"]!;
    const dst_pos = nodes[targetId]["geo_info"]!;

    //使用端点间的直线距离计算length。注意端点坐标是经纬度。
    const R = 6371; // 地球半径，单位为千米
    const φ1 = (src_pos[1] * Math.PI) / 180;
    const φ2 = (dst_pos[1] * Math.PI) / 180;
    const Δφ = ((dst_pos[1] - src_pos[1]) * Math.PI) / 180;
    const Δλ = ((dst_pos[0] - src_pos[0]) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // 返回距离，单位为千米

    return distance / (this.model === "distance" ? 1 : 3);
  }

  registerCallbacks(graphEventManager: GraphEventManager): void {
    graphEventManager.on("NodeAdded", (id: string) => {
      this.ctx.data.nodes()[id] = {
        id: id,
        name: `${id}`,
        geo_info: [0, 0],
        access_info: 0,
        degree: 0,
      };
      if (!this.isiniting) this.ctx.onParamChange(id);
    });

    graphEventManager.on("NodeRemoved", (id: string) => {
      delete this.ctx.data.nodes()[id];
      if (!this.isiniting) this.ctx.onParamChange(id);
    });

    graphEventManager.on("EdgeAdded", (id: string) => {
      const sourceId = Graph.getSourceId(id);
      const targetId = Graph.getTargetId(id);
      const distance = this.graph.getEdgeById(id)!.length * (this.model === "distance" ? 1 : 3);

      const edgeData =
        this.ctx.data.adjacencyTable()[sourceId][targetId] ??
        this.ctx.data.adjacencyTable()[targetId][sourceId];
      if (!edgeData) {
        this.ctx.data.adjacencyTable()[sourceId][targetId] = {
          id,
          name: id,
          trainShifts: 0,
          params: [distance, 3 * distance, 0],
        };
      }
      this.ctx.data.adjacencyTable()[sourceId][targetId].params = [distance, 3 * distance, 0];
      if (!this.isiniting) {
        this.ctx.data.nodes()[sourceId].degree++;
        this.ctx.data.nodes()[targetId].degree++;
        this.ctx.onParamChange(id);
      }
    });

    graphEventManager.on("EdgeRemoved", (id: string) => {
      const sourceId = Graph.getSourceId(id);
      const targetId = Graph.getTargetId(id);

      delete this.ctx.data.adjacencyTable()[sourceId][targetId];
      if (!this.isiniting) {
        this.ctx.data.nodes()[sourceId].degree--;
        this.ctx.data.nodes()[targetId].degree--;
        this.ctx.onParamChange(id);
      }
    });
  }

  private loadNodes(): void {
    const positionData = this.ctx.data.nodes();
    Object.entries(positionData).forEach(([name, coordinates]: [string, any]) => {
      // 将原始坐标应用投影和缩放：
      coordinates = coordinates["geo_info"];
      const [x, y] = this.projection([coordinates[0], coordinates[1]])!;
      const node = {
        _id: name,
        name,
        x,
        y,
        vx: 0,
        vy: 0,
      };
      this.graph.addNode(node);
    });
  }

  private async loadEdges(model: "distance" | "time"): Promise<void> {
    return Promise.resolve(this.ctx.data.adjacencyTable()).then((data) => {
      // 哦草了，不要问我为什么要把这里写成异步的。不这样写会有很奇怪的bug，天哪。不信你可以试试用下面注释里的内容跑一下。
      // const data = this.ctx.data.adjacencyTable();
      Object.entries(data).forEach(([sourceId, value]: [string, any]) => {
        Object.entries(value).forEach(([targetId, target]: [string, any]) => {
          let length;
          if (model === "distance") {
            length = target[1];
          } else {
            length = target[0];
          }
          const edgeId = Graph.getEdgeId(sourceId, targetId);
          const edge = {
            _id: edgeId,
            name: edgeId,
            source: sourceId,
            target: targetId,
            length: length,
          };
          this.graph.addEdge(edge);
        });
      });
    });
  }

  public clear(): void {
    this.canvasEventAnalyst.deactivate();

    this.graphEventManager.clear();
    this.canvasEventManager.clear();

    this.simulator = null;
    this.graph.clear();

    this.g.selectAll("*").remove();

    this.model = null;
  }

  public init(model: "distance" | "time"): void {
    this.isiniting = true;

    this.model = model;

    this.svg.on("click", () => {});

    this.loadNodes();
    const promise = this.loadEdges(model);
    this.simulator = new ForceSimulator(this, this.graph, this.g, this.canvasEventManager);

    this.graph.registerCallbacks(this.canvasEventManager);
    this.simulator.registerCallbacks(this.graphEventManager);
    this.registerCallbacks(this.graphEventManager);

    this.canvasEventAnalyst.activate();

    promise.then(() => {
      this.isiniting = false;
    });
  }

  public render(): void {
    this.svg.call(this.zoom as any);
    this.svg.call(this.zoom.transform, d3.zoomTransform(this.svg.node()));
  }

  exploreParams = (id: string) => this.ctx.exploreParams(id);
  setNodeFirst = (nodeId: string) => this.ctx.choosed.setNodeFirst(nodeId);
  setNodeSecond = (nodeId: string) => this.ctx.choosed.setNodeSecond(nodeId);
  data = () => this.ctx.data;

  onNodeFirstChange = (oldNodeId: string | null, newNodeId: string | null) =>
    this.simulator!.onNodeFirstChange(oldNodeId, newNodeId);
  onNodeSecondChange = (oldNodeId: string | null, newNodeId: string | null) =>
    this.simulator!.onNodeSecondChange(oldNodeId, newNodeId);
  renderShorestPath = (pathInfo: Path) =>
    this.simulator!.renderTrainLine(pathInfo.params.passByNodesId, pathInfo.params.passByEdgesId);
  clearTrainLine = () => this.simulator!.clearTrainLine();
}
