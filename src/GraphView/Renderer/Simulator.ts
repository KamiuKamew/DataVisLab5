import * as d3 from "d3";
import { Graph, Node, Edge } from "../Basic/Graph";
import { CanvasEventManager } from "./EventManager";
import { GraphEventManager } from "../Basic/EventManager";
import { Names } from "../../Global/Names";
import { GraphContext } from "../GraphContext";

// 定义常量
const NODE_DEFAULT_RADIUS = 5; // 节点的默认半径

/**
 * 力学仿真类，用于处理节点和边的力学模拟与更新。
 * 同时也负责渲染。
 *
 * 需要注册回调函数。
 */
export class ForceSimulator {
  private width: number; // SVG 宽度
  private height: number; // SVG 高度
  private simulation: d3.Simulation<Node, Edge>; // D3 力学仿真对象

  private draggedNode: Node | null = null; // 当前拖拽的节点
  private dragTarget: { x: number; y: number } | null = null; // 鼠标拖拽目标位置

  constructor(
    private ctx: GraphContext,
    private graph: Graph,
    private canvas: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    private canvasEventManager: CanvasEventManager
  ) {
    this.width = 1200;
    this.height = 800;

    canvas.append("g").attr("class", "edges"); // 初始化边容器
    canvas.append("g").attr("class", "nodes"); // 初始化节点容器

    const nodes = this.graph.getNodes();
    const edges = this.graph.getEdges();

    // 创建 D3 力学仿真
    this.simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink<Node, Edge>(edges)
          .id((d) => d._id)
          .distance((d) => d.length / 2) // 使用edge的属性length作为边的长度
          .strength(0.005) // 边的力度
      )
      .force("charge", d3.forceManyBody().strength(-10))
      .force("x", d3.forceX(this.width / 2).strength(0.01))
      .force("y", d3.forceY(this.height / 2).strength(0.01))
      .force("drag", this.createDragForce(0.01));

    // Tick 更新逻辑
    this.simulation.on("tick", () => {
      this.updateEdges();
      this.updateNodes();
      this.updatePositions();
    });
  }

  /**
   * 向其他模块注册回调函数。
   */
  registerCallbacks(graphEventManager: GraphEventManager): void {
    graphEventManager.on("NodeAdded", (nodeId: string) => {
      this.simulation.nodes(this.graph.getNodes());
      this.simulation.alpha(1).restart();
    });

    graphEventManager.on("EdgeAdded", (edgeId: string) => {
      const links = this.graph.getEdges().map((edge) => ({
        ...edge,
        source: edge.source,
        target: edge.target,
      }));
      (this.simulation.force("link") as d3.ForceLink<Node, Edge>).links(links);
      this.simulation.alpha(1).restart();
    });

    graphEventManager.on("NodeRemoved", (nodeId: string) => {
      this.simulation.nodes(this.graph.getNodes());
      this.simulation.alpha(1).restart();
    });

    graphEventManager.on("EdgeRemoved", (edgeId: string) => {
      const links = this.graph.getEdges().map((edge) => ({
        ...edge,
        source: edge.source,
        target: edge.target,
      }));
      (this.simulation.force("link") as d3.ForceLink<Node, Edge>).links(links);
      this.simulation.alpha(1).restart();
    });
  }

  /**
   * 更新节点的显示。
   * 对节点数据进行绑定，并根据仿真结果更新其位置。
   */
  private updateNodes(): void {
    const nodeGroup = this.canvas.select(".nodes");
    const node = nodeGroup
      .selectAll<SVGGElement, Node>("g") // 使用g元素包裹每个节点和标签
      .data(this.graph.getNodes(), (d: Node) => d._id);

    const transform = d3.zoomTransform(this.canvas.node()!);

    // 定义颜色和半径比例尺
    const colorScale = d3
      .scaleLinear<string>()
      .domain([10000, 25000]) // 假设节点的数量在 0 到 100 之间
      .range(["steelblue", "tomato"]);

    const radiusScale = d3.scaleLinear<number>().domain([0, 15]).range([5, 15]);

    const k = 1.5;

    // 创建新的节点和标签
    const nodes = node
      .enter()
      .append("g")
      .attr("id", (d: any) => d._id)
      .attr(
        "transform",
        (d: any) => `translate(${d.x}, ${d.y})` // 直接使用节点的坐标进行平移
      );

    // 创建标签背景和边框
    nodes
      .append("rect")
      .attr("x", -25 / k) // 设置矩形的起始位置
      .attr("y", -20 / k) // 设置矩形的起始位置
      .attr("width", 50 / k) // 设置宽度
      .attr("height", 20 / k) // 设置高度
      .attr("rx", 5 / k) // 设置圆角
      .attr("ry", 5 / k) // 设置圆角
      .style("fill", "white")
      .style("stroke", "black")
      .style("stroke-width", 1 / k)
      .style("opacity", 0.7)
      .on("mouseover", (event: MouseEvent, d: any) => {
        d3.select((event.currentTarget as any).parentNode).raise();
      });

    // 绘制节点
    nodes
      .append("circle")
      .attr("id", (d) => `node-${d._id}`)
      .attr("r", (d: any) => radiusScale(this.ctx.data().nodes()[d._id].degree)) // 根据数据值设置半径
      .attr("fill", (d: any) => colorScale(this.ctx.data().nodes()[d._id].access_info)) // 根据数据值设置颜色
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .each((d: any) => {
        d.hoved = false;
      })
      .on("mouseover", (event, d: any) => {
        d3.select(event.target).attr("stroke", "white").attr("stroke-width", 2);
        d.hoved = true;
      })
      .on("mouseout", (event, d: any) => {
        d3.select(event.target).attr("stroke", "black").attr("stroke-width", 1);
        d.hoved = false;
      })
      .on("click", (event: MouseEvent, d: any) => {
        this.canvasEventManager.trigger("NodeClicked", { event, id: d._id });
      })
      .on("mousedown", (event: MouseEvent, d: any) => {
        const nodeId = d._id;
        if (event.button === 0) this.ctx.setNodeFirst(nodeId);
        else if (event.button === 2) this.ctx.setNodeSecond(nodeId);
      })
      .call((enter) => {
        this.applyDragBehavior(enter);
      });

    // 创建标签
    nodes
      .append("text")
      .attr("x", 0) // 设置标签的偏移量
      .attr("y", -6 / k)
      .attr("text-anchor", "middle")
      .style("font-size", `${12 / k}px`)
      .style("cursor", "pointer")
      .text((d: any) => d.name) // 显示节点名称
      .on("mouseover", (event: MouseEvent, d: any) => {
        d3.select((event.currentTarget as any).parentNode).raise();
      });

    // 删除已退出的节点
    node.exit().remove();

    // 更新节点位置
    node.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
  }

  onNodeFirstChange(oldNodeId: string | null, newNodeId: string | null): void {
    if (oldNodeId) d3.select(`#node-${oldNodeId}`).attr("stroke", "black");
    if (newNodeId) d3.select(`#node-${newNodeId}`).attr("stroke", "red");
  }

  onNodeSecondChange(oldNodeId: string | null, newNodeId: string | null): void {
    if (oldNodeId) d3.select(`#node-${oldNodeId}`).attr("stroke", "black");
    if (newNodeId) d3.select(`#node-${newNodeId}`).attr("stroke", "yellow");
  }

  /**
   * 更新边的显示。
   * 根据仿真结果重新计算边的位置和形状。
   */
  private updateEdges(): void {
    const edgeGroup = this.canvas.select(".edges");

    // 边检测区域
    const edgePath = edgeGroup
      .selectAll<SVGPathElement, Edge>("path")
      .data(this.graph.getEdges(), (d: Edge) => `${d.source}-${d.target}`);

    edgePath
      .enter()
      .append("path")
      .attr("id", (d) => `edge-${d._id}`)
      .attr("fill", "none")
      .attr("stroke", "transparent")
      .attr("stroke-width", 5)
      .each((d: any) => {
        d.hoved = false;
      })
      .on("mouseover", (event, d: any) => {
        d3.select(event.target).attr("stroke", "lightblue");
        d.hoved = true;
        // console.log("Mouseover on edge:", d);
      }) // 设置鼠标移入边时变色
      .on("mouseout", (event, d: any) => {
        d.hoved = false;
        d3.select(event.target).attr("stroke", "transparent");
      }) // 设置鼠标移出边时恢复
      .on("click", (event: MouseEvent, d: any) => {
        // 阻止事件传播
        event.stopPropagation();
        console.log("[ForceSimulator] clicked line: ", d);
        this.ctx.exploreParams(d._id);
      });

    edgePath.attr("d", (d) => {
      const source = this.graph.getNodeById(d.source);
      const target = this.graph.getNodeById(d.target);
      if (source && target) {
        return `M ${source.x},${source.y} L ${target.x},${target.y}`;
      }
      return null;
    });

    edgePath.exit().remove();

    const link = edgeGroup
      .selectAll<SVGLineElement, Edge>("line")
      .data(this.graph.getEdges(), (d: Edge) => `${d.source}-${d.target}`);

    link
      .enter()
      .append("line")
      .attr("id", (d) => `edge-${d._id}`)
      .attr("stroke", "gray")
      .attr("stroke-width", 1)
      .on("click", (event: MouseEvent, d: any) => {
        // 阻止事件传播
        event.stopPropagation();
        console.log("[ForceSimulator] clicked line: ", d);
        this.ctx.exploreParams(d._id);
      });

    link.exit().remove();

    link
      .attr("x1", (d) => this.graph.getNodeById(d.source)?.x ?? 0)
      .attr("y1", (d) => this.graph.getNodeById(d.source)?.y ?? 0)
      .attr("x2", (d) => this.graph.getNodeById(d.target)?.x ?? 0)
      .attr("y2", (d) => this.graph.getNodeById(d.target)?.y ?? 0);
  }

  /**
   * 更新图数据位置。
   */
  private updatePositions(): void {
    this.graph.getNodes().forEach((node) => {
      node.x = node.x ?? 0;
      node.y = node.y ?? 0;
    });
  }

  /**
   * 创建拖拽力。
   * @param {number} strength - 力度系数。
   * @returns {d3.Force<Node, Edge>} 自定义的拖拽力。
   */
  private createDragForce(strength: number = 0.1): d3.Force<Node, Edge> {
    return () => {
      if (this.draggedNode && this.dragTarget) {
        const dx = this.dragTarget.x - this.draggedNode.x;
        const dy = this.dragTarget.y - this.draggedNode.y;
        this.draggedNode.vx += dx * strength;
        this.draggedNode.vy += dy * strength;
      }
    };
  }

  /**
   * 为节点应用拖拽行为。
   * @param {d3.Selection<SVGCircleElement, Node, any, any>} nodeSelection - 节点的 D3 选择器。
   */
  public applyDragBehavior(nodeSelection: d3.Selection<SVGCircleElement, Node, any, any>): void {
    nodeSelection.call(
      d3
        .drag<SVGCircleElement, Node>()
        .on("start", this.dragStarted.bind(this))
        .on("drag", this.dragged.bind(this))
        .on("end", this.dragEnded.bind(this))
    );
  }

  private dragStarted(event: d3.D3DragEvent<SVGCircleElement, Node, Node>): void {
    this.draggedNode = event.subject;
    this.dragTarget = { x: event.x, y: event.y };
    this.simulation.alphaTarget(0.3).restart();
  }

  private dragged(event: d3.D3DragEvent<SVGCircleElement, Node, Node>): void {
    if (this.dragTarget) {
      this.dragTarget.x = event.x;
      this.dragTarget.y = event.y;
    }
  }

  private dragEnded(event: d3.D3DragEvent<SVGCircleElement, Node, Node>): void {
    if (this.draggedNode)
      // this.controller.getCanvasEventAnalyst().onDragEnd(event, this.draggedNode);
      this.canvasEventManager.trigger("NodeDragEnd", {
        event: new MouseEvent("dragend"),
        id: this.draggedNode._id,
        metaData: { DragEndNode: this.findNodeUnderPlace(event.x, event.y) },
      });
    this.draggedNode = null;
    this.dragTarget = null;
    this.simulation.alphaTarget(0);
  }

  private findNodeUnderPlace(x: number, y: number): Node | null {
    const foundNode: string[] = [];
    this.canvas.selectAll("g").each(function (d, i) {
      const circles = d3.select(this).selectAll("circle");
      // console.log(`g element ${i} circles:`, circles.size() > 0 ? circles.nodes() : "No circles");
      circles.each((d: any) => {
        if (d.hoved) foundNode.push(d._id);
      });
    });
    // console.log(`foundNode:`, foundNode);
    return this.graph.getNodeById(foundNode[0]) ?? null;
  }

  public renderTrainLine(passByNodesId: string[], passByEdgesId: string[]): void {
    passByNodesId.forEach((nodeId) => {
      d3.select(`#node-${nodeId}`)
        .attr("stroke", "red")
        .on("mouseover", (event, d: any) => {
          d3.select(event.target).attr("stroke", "#ff7777");
          d.hoved = true;
          console.log("Mouseover on node:", d);
        }) // 设置鼠标移入节点时变色
        .on("mouseout", (event, d: any) => {
          d3.select(event.target).attr("stroke", "red");
          d.hoved = false;
        });
    });
    passByEdgesId.forEach((edgeId) => {
      d3.select(`#edge-${edgeId}`)
        .attr("stroke", "red")
        .on("mouseover", (event, d: any) => {
          d3.select(event.target).attr("stroke", "#ff7777");
          d.hoved = true;
          console.log("Mouseover on edge:", d);
        })
        .on("mouseout", (event, d: any) => {
          d.hoved = false;
          d3.select(event.target).attr("stroke", "red");
        });
    });
  }
  public clearTrainLine(): void {
    const nodes = this.graph.getNodes();
    nodes.forEach((node) => {
      d3.select(`#node-${node._id}`)
        .attr("stroke", "black")
        .on("mouseover", (event, d: any) => {
          d3.select(event.target).attr("stroke", "white");
          d.hoved = true;
          // console.log("Mouseover on node:", d);
        }) // 设置鼠标移入节点时变色
        .on("mouseout", (event, d: any) => {
          d3.select(event.target).attr("stroke", "black");
          d.hoved = false;
        });
    });
    const edges = this.graph.getEdges();
    edges.forEach((edge) => {
      d3.select(`#edge-${edge._id}`)
        .attr("stroke", "transparent")
        .on("mouseover", (event, d: any) => {
          d3.select(event.target).attr("stroke", "lightblue");
          d.hoved = true;
          // console.log("Mouseover on edge:", d);
        })
        .on("mouseout", (event, d: any) => {
          d.hoved = false;
          d3.select(event.target).attr("stroke", "transparent");
        });
    });
  }
}
