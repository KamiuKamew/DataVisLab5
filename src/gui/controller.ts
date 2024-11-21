import { Graph, Node, Edge } from "../core/Graph";
import { ForceSimulator } from "./force";
import { MouseEventManager } from "./Canvas/Event/Manager";
import { PanelRender } from "./Panel/Render";

import * as d3 from "d3";
import { GraphEvent, GraphEventCallback, GraphEvents } from "../core/Graph/EventManager";
import {
  CanvasMouseEvent,
  CanvasMouseEventCallback,
  CanvasMouseEvents,
} from "./Canvas/Event/canvas_mouse_event_manager";

/**
 * 控制图形的主要类，负责图形的管理、力学仿真和事件处理。
 */
export class GUIController {
  private graph: Graph; // 图数据结构
  private forceSimulation: ForceSimulator; // 力学仿真器
  private eventManager: MouseEventManager; // 鼠标事件管理器
  private parameterExplorer: PanelRender; // 参数可视化绘制器

  /**
   * 构造函数，初始化图形控制器。
   * @param {SVGSVGElement} svg - 用于渲染的SVG容器。
   */
  constructor(
    private svg: SVGSVGElement // 用于渲染的SVG容器。 // private chartDrawer: ChartDrawer // 用于绘制图表。不应当直接被此类调用，后续应该写一个整体框架，通过框架调用这个模块 // TODO
  ) {
    // 初始化SVG，设置背景颜色。
    this.svg = d3.select(svg).style("background-color", "#f9f9f9").node() as SVGSVGElement;

    // 初始化各模块。
    this.graph = new Graph(this);
    this.forceSimulation = new ForceSimulator(this);
    this.forceSimulation.applyDragBehavior(d3.select(this.svg).selectAll("circle"));
    this.eventManager = new MouseEventManager(this);
    this.parameterExplorer = new PanelRender(this.getGraph().getParamManager(), this);

    // **在所有模块初始化结束后**，注册回调函数。
    this.graph.registerCallbacks();
    this.forceSimulation.registerCallbacks();
    this.parameterExplorer.registerCallbacks();
  }

  /**
   * 获取当前图结构。
   * @returns {Graph} 当前的图对象。
   */
  public getGraph(): Graph {
    return this.graph;
  }

  /**
   * 获取SVG容器。
   * @returns {SVGSVGElement} 当前的SVG容器。
   */
  public getSVG(): SVGSVGElement {
    return this.svg;
  }

  /**
   * 获取事件管理器。
   * @returns {MouseEventManager} 当前的事件管理器实例。
   */
  public getEventManager(): MouseEventManager {
    return this.eventManager;
  }
  public addNode(node: Node): string {
    return this.graph.addNode(node);
  }

  public addEdge(edge: Edge): void {
    this.graph.addEdge(edge);
  }

  public removeNode(node: Node): void {
    this.graph.removeNode(node._id);
  }

  public removeEdge(edge: Edge): void {
    this.graph.removeEdge(edge);
  }

  public on(
    event: GraphEvent | CanvasMouseEvent,
    callback: GraphEventCallback | CanvasMouseEventCallback
  ) {
    if (GraphEvents.has(event as GraphEvent)) {
      this.graph.on(event as GraphEvent, callback as GraphEventCallback);
    } else if (CanvasMouseEvents.has(event as CanvasMouseEvent)) {
      this.eventManager.on(event as CanvasMouseEvent, callback as CanvasMouseEventCallback);
    }
  }
}
