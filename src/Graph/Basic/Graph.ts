import * as d3 from "d3";
import { GraphEventManager } from "./EventManager";
import { CanvasEventManager } from "../Renderer/EventManager";
import { GraphContext } from "../GraphContext";

/**
 * 节点接口，描述节点的属性。
 */
export interface Node {
  _id: string; // 节点唯一标识符
  name: string; // 节点的名称
  x: number; // 节点的 x 坐标
  y: number; // 节点的 y 坐标
  vx: number; // 节点的 x 方向速度
  vy: number; // 节点的 y 方向速度
}

/**
 * 边接口，描述边的属性。
 */
export interface Edge {
  _id: string;
  name: string;
  source: string; // 边的起点节点 ID
  target: string; // 边的终点节点 ID
  length: number; // 边的长度
}

/**
 * 图类，用于管理图的节点和边数据。
 *
 * 需要注册回调函数。
 */
export class Graph {
  private nodes: Map<string, Node>; // 存储节点的映射表
  private edges: Map<string, Edge>; // 存储边的映射表，键格式为 "source-target"
  private adjacencyList: Map<string, { inEdges: Set<string>; outEdges: Set<string> }>; // 邻接表
  private nodeIndex: number; // 节点索引计数器

  /**
   * 构造函数，初始化图的结构。
   */
  constructor(
    private ctx: GraphContext,
    private eventManager: GraphEventManager,
    private canvas: SVGSVGElement
  ) {
    // 基本数据结构，存储基本内容（节点、边、邻接表、索引管理器），应当第一个被初始化
    this.nodes = new Map();
    this.edges = new Map();
    this.adjacencyList = new Map();
    this.nodeIndex = 0;
  }

  /**
   * 向其他模块注册回调函数。
   * 该函数应当在其他模块初始化之后被调用，以便注册回调函数。
   */
  registerCallbacks(canvasEventManager: CanvasEventManager): void {
    canvasEventManager.on("CanvasClicked", (event: MouseEvent) => {
      const [x, y] = d3.pointer(event, this.canvas);
      let id = this.addNode({
        _id: "-1",
        name: "New Node",
        x: x,
        y: y,
        vx: 0,
        vy: 0,
      });
    });
    canvasEventManager.on("NodeDragEnd", (event: MouseEvent, nodeId, metaData) => {
      if (nodeId && metaData && "DragEndNode" in metaData) {
        const dragEndNode = metaData["DragEndNode"];
        if (dragEndNode && dragEndNode._id !== nodeId) {
          this.addEdge(createDefaultEdge(nodeId, dragEndNode._id, 1));
        }
      }
    });
  }

  clear(): void {
    this.adjacencyList.clear();
    this.edges.clear();
    this.nodes.clear();
    this.nodeIndex = 0;
  }

  /**
   * 添加节点到图中。
   * @param {Node} node - 要添加的节点。
   * @returns {string} 返回分配给该节点的唯一 ID。
   */
  addNode(node: Node): string {
    if (node._id === "-1") {
      node._id = `${this.nodeIndex}`;
      this.nodeIndex++;
    }

    this.nodes.set(node._id, node);
    this.adjacencyList.set(node._id, { inEdges: new Set(), outEdges: new Set() });

    this.eventManager.trigger("NodeAdded", { id: node._id });

    return node._id;
  }

  /**
   * 从图中移除节点。
   * @param {number} nodeId - 要移除的节点 ID。
   */
  removeNode(nodeId: string): void {
    if (!this.nodes.has(nodeId)) return;

    if (this.hasNeighbor(nodeId)) {
      console.warn(
        `Node ${nodeId} has related edges, cannot remove it. Egdes:`,
        this.adjacencyList.get(nodeId)!.inEdges,
        this.adjacencyList.get(nodeId)!.outEdges
      );
      return;
    }

    this.nodes.delete(nodeId);
    this.adjacencyList.delete(nodeId);

    this.eventManager.trigger("NodeRemoved", { id: nodeId });
  }

  /**
   * 添加边到图中。
   * @param {Edge} edge - 要添加的边。
   */
  addEdge(edge: Edge): void {
    const key = Graph.getEdgeId(edge.source, edge.target);
    if (this.edges.has(key)) return;

    edge.length = this.ctx.calculateDistance(edge.source, edge.target);
    this.edges.set(key, edge);
    (
      this.adjacencyList.get(edge.source) ??
      (() => {
        console.warn(`Source node not found:`, edge.source, edge, this.nodes);
        throw new Error("Source node not found.");
      }).call(null)
    ).outEdges.add(edge.target);
    (
      this.adjacencyList.get(edge.target) ??
      (() => {
        console.warn(`Target node not found:`, edge.target, edge, this.nodes);
        throw new Error("Target node not found.");
      }).call(null)
    ).inEdges.add(edge.source);

    this.eventManager.trigger("EdgeAdded", { id: edge._id });
  }

  /**
   * 从图中移除边。
   * @param {Edge} edge - 要移除的边。
   */
  removeEdge(edge: Edge): void {
    const key = Graph.getEdgeId(edge.source, edge.target);
    if (!this.edges.has(key)) return;

    this.edges.delete(key);
    this.adjacencyList.get(edge.source)!.outEdges.delete(edge.target);
    this.adjacencyList.get(edge.target)!.inEdges.delete(edge.source);

    this.eventManager.trigger("EdgeRemoved", { id: edge._id });
  }

  static isEdgeId(id: string): boolean {
    return id.includes("-");
  }

  // 通过sourcId和targetId获取边Id
  static getEdgeId(sourceId: string, targetId: string): string {
    return `${sourceId}-${targetId}`;
  }

  // 通过边Id获取sourceId和targetId
  static getSourceId(edgeId: string): string {
    return edgeId.split("-")[0];
  }

  static getTargetId(edgeId: string): string {
    return edgeId.split("-")[1];
  }

  /**
   * 获取图中的所有节点。
   * @returns {Node[]} 节点数组。
   */
  getNodes(): Node[] {
    return Array.from(this.nodes.values());
  }

  /**
   * 获取图中的所有边。
   * @returns {Edge[]} 边数组。
   */
  getEdges(): Edge[] {
    return Array.from(this.edges.values());
  }

  /**
   * 根据节点 ID 获取节点。
   * @param {number} nodeId - 节点 ID。
   * @returns {Node | undefined} 对应的节点对象。
   */
  getNodeById(nodeId: string): Node | undefined {
    return this.nodes.get(nodeId);
  }

  getEdgeById(edgeId: string): Edge | undefined {
    return this.edges.get(edgeId);
  }

  /**
   * 获取连接到指定节点的源节点数组。
   * @param {string} nodeId - 节点 ID。
   * @returns {Node[]} 源节点数组。
   */
  getSourceNodes(nodeId: string): Node[] {
    return Array.from(this.adjacencyList.get(nodeId)!.inEdges)
      .map((sourceId) => this.nodes.get(sourceId)!)
      .filter(Boolean);
  }

  /**
   * 获取从指定节点连接的目标节点数组。
   * @param {string} nodeId - 节点 ID。
   * @returns {Node[]} 目标节点数组。
   */
  getTargetNodes(nodeId: string): Node[] {
    return Array.from(this.adjacencyList.get(nodeId)!.outEdges)
      .map((targetId) => this.nodes.get(targetId)!)
      .filter(Boolean);
  }

  getSourceEdges(nodeId: string): Edge[] {
    return Array.from(this.adjacencyList.get(nodeId)!.inEdges)
      .map((sourceId) => this.edges.get(Graph.getEdgeId(sourceId, nodeId))!)
      .filter(Boolean);
  }

  getTargetEdges(nodeId: string): Edge[] {
    return Array.from(this.adjacencyList.get(nodeId)!.outEdges)
      .map((targetId) => this.edges.get(Graph.getEdgeId(nodeId, targetId))!)
      .filter(Boolean);
  }

  /**
   * 判断节点是否存在。
   * @param {number} nodeId - 节点 ID。
   * @returns {boolean} 节点是否存在。
   */
  hasNode(nodeId: string): boolean {
    return this.nodes.has(nodeId);
  }

  /**
   * 判断边是否存在。
   * @param {string} source - 边的起点节点 ID。
   * @param {string} target - 边的终点节点 ID。
   * @returns {boolean} 边是否存在。
   */
  hasEdge(source: string, target: string): boolean {
    return this.edges.has(`${source}-${target}`);
  }

  /**
   * 检查指定节点是否有相邻的源或目标节点。
   * @param {string} nodeId - 节点 ID。
   * @returns {boolean} 是否有相邻节点。
   */
  hasNeighbor(nodeId: string): boolean {
    return (
      this.adjacencyList.get(nodeId)!.inEdges.size > 0 ||
      this.adjacencyList.get(nodeId)!.outEdges.size > 0
    );
  }

  /**
   * 获取图的字符串表示。
   * @returns {string} 图的概要信息。
   */
  toString(): string {
    const nodesInfo = Array.from(this.nodes.values())
      .map(
        (node) => `Node ${node._id}: (${node.x.toFixed(2)}, ${node.y.toFixed(2)}) - Info: "TODO"`
      )
      .join("\n");
    const edgesInfo = Array.from(this.edges.values())
      .map((edge) => `Edge: ${edge.source} -> ${edge.target} (Weight: ${edge.length})`)
      .join("\n");
    return `Graph Overview:\nNodes:\n${nodesInfo}\n\nEdges:\n${edgesInfo}`;
  }
}

/**
 * 创建一个默认边。
 * @param {number} sourceId - 边的起点节点 ID。
 * @param {number} targetId - 边的终点节点 ID。
 * @param {number} [weight=1] - 边的权重，默认为 1。
 * @returns {Edge} 默认边实例。
 */
export function createDefaultEdge(sourceId: string, targetId: string, length: number = 1): Edge {
  return {
    _id: Graph.getEdgeId(sourceId, targetId),
    name: Graph.getEdgeId(sourceId, targetId),
    source: sourceId,
    target: targetId,
    length: length,
  };
}
