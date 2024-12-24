import * as d3 from "d3";
import { Context } from "../Context";
import { NodeTable } from "../Global/Data";
import { Graph } from "../GraphView/Basic/Graph";

export class MapContext {
  private width: number = 975;
  private height: number = 610;

  private svg: d3.Selection<any, any, any, any>;
  private g: d3.Selection<any, any, any, any>;
  private gMap: d3.Selection<any, any, any, any>;
  private gMapProvinces: d3.Selection<any, any, any, any>;
  private gMapCounties: d3.Selection<any, any, any, any>;
  private gNodes: d3.Selection<any, any, any, any>;
  private gLines: d3.Selection<any, any, any, any>;

  public zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;
  public projection: d3.GeoProjection;

  constructor(private ctx: Context) {
    this.svg = d3.select("svg");
    this.g = this.svg.append("g").attr("class", "g");
    this.gMap = this.g.append("g").attr("class", "gMap");
    this.gMapProvinces = this.gMap.append("g").attr("class", "gMapProvinces");
    this.gMapCounties = this.gMap.append("g").attr("class", "gMapCounties");
    this.gLines = this.g.append("g").attr("class", "gLines");
    this.gNodes = this.g.append("g").attr("class", "gNodes");

    this.zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.01, 8]) // 设置缩放比例范围
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => this.zoomed(event)); // 在缩放时调用 zoomed 函数

    // 设置投影参数
    this.projection = d3
      .geoMercator()
      .center([100, 38]) // 设置地图的中心（可以根据数据调整）
      .scale(800) // 缩放级别（根据数据调整）
      .translate([this.width / 2, this.height / 2]); // 平移到屏幕中心

    d3.select("svg").on("contextmenu", (event: MouseEvent) => {
      event.preventDefault(); // 阻止右键菜单
    });
  }

  // 重置视图
  private reset(): void {
    console.log("reset");
    const provinces = this.gMap.selectAll(".province");
    provinces.transition().style("fill", "rgba(0, 0, 0, 0.2)"); // 清除点击时的填充色
    this.svg
      .transition()
      .duration(750)
      .call(
        this.zoom.transform as any,
        d3.zoomIdentity, // 恢复到初始缩放状态
        d3.zoomTransform(this.svg.node() as SVGSVGElement).invert([this.width / 2, this.height / 2])
      );

    // 重置点击状态
    provinces.each((d: any) => {
      d.clicked = false;
    });
  }

  // 点击州时的缩放
  private clicked(event: MouseEvent, d: any, path: d3.GeoPath<any>): void {
    const provinces = this.gMap.selectAll(".province");
    console.log("clicked");
    if (d.clicked) return this.reset(); // 若当前州已被点击，则重置视图
    provinces.each((d: any) => {
      d.clicked = false; // 清除其他州的点击状态
    });
    d.clicked = true;

    const [[x0, y0], [x1, y1]] = path.bounds(d);
    event.stopPropagation(); // 阻止事件传播
    provinces.transition().style("fill", "rgba(0, 0, 0, 0.8)"); // 清除其他州的填充色
    if (event.currentTarget) {
      d3.select(event.currentTarget as HTMLElement)
        .transition()
        .style("fill", "rgba(0, 0, 0, 0.2)"); // 给当前点击的州填充色
    }
    this.svg
      .transition()
      .duration(750)
      .call(
        this.zoom.transform as any,
        d3.zoomIdentity
          .translate(this.width / 2, this.height / 2)
          .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / this.width, (y1 - y0) / this.height))) // 缩放到适合区域
          .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
        d3.pointer(event, this.svg.node() as SVGSVGElement) // 获取点击位置
      );
  }

  // 缩放时更新视图
  private zoomed(event: d3.D3ZoomEvent<SVGSVGElement, unknown>): void {
    console.log("zoomed");
    const { transform } = event;

    // 应用缩放变换
    this.g.attr("transform", transform.toString());

    // 调整边界线的粗细
    this.gMap.selectAll(".province").attr("stroke-width", 0 / transform.k);
    this.gMap.selectAll(".state").attr("stroke-width", 0.5 / transform.k);

    // 调整节点大小，使其始终保持相同的视觉大小
    this.gNodes
      .selectAll("circle")
      .attr("r", this.nodeRadiusEncoder(transform)) // 设置圆的半径
      .attr("stroke-width", this.nodeStrokeWidthEncoder(transform, 2)); // 这里的 5 是节点的默认半径

    // 调整线的粗细
    this.gLines.selectAll("path").attr("stroke-width", this.lineWidthEncoder(transform));

    this.gNodes
      .selectAll("text")
      .attr("y", -6 / transform.k)
      .style("font-size", `${12 / transform.k}px`);

    this.gNodes
      .selectAll("rect")
      .attr("x", -25 / transform.k) // 设置矩形的起始位置
      .attr("y", -20 / transform.k) // 设置矩形的起始位置
      .attr("width", 50 / transform.k) // 设置宽度
      .attr("height", 20 / transform.k) // 设置高度
      .attr("rx", 5 / transform.k) // 设置圆角
      .attr("ry", 5 / transform.k) // 设置圆角
      .style("stroke-width", 1 / transform.k);
  }

  public renderMap(): void {
    const transform = d3.zoomTransform(this.svg.node());
    for (let i = 11; i <= 90; i++) {
      d3.json("./data/geometryProvince/" + i + ".json")
        .then((geoData: any) => {
          const path = d3.geoPath().projection(this.projection);

          const counties = this.gMapCounties
            .append("g")
            .attr("fill", "none")
            .attr("stroke", "#444")
            .attr("cursor", "pointer")
            .selectAll<SVGPathElement, any>("path")
            .data(
              geoData.features.filter(
                (d: any) => d.properties.name !== "昆玉市" && d.properties.name !== "静安区"
              )
            )
            .join("path")
            .attr("d", path as any)
            .attr("stroke-width", 0.5 / transform.k)
            .attr("fill", "rgba(128, 128, 128, 0.2)")
            .attr("class", "state");

          counties.append("title").text((d: any) => d.properties.name);
        })
        .catch((error: any) => {});
    }

    d3.json("./data/geometryProvince/china.json").then((chinaGeoData: any) => {
      const path = d3.geoPath().projection(this.projection);

      this.gMapProvinces
        .append("g")
        .attr("fill", "none")
        .attr("stroke", "#aaa")
        .attr("stroke-width", 2)
        .selectAll("path")
        .data(chinaGeoData.features)
        .join("path")
        .attr("d", path as any)
        .attr("fill", "none");

      const provinces = this.gMap
        .append("g")
        .attr("fill", "none")
        .attr("stroke", "#444")
        .attr("cursor", "pointer")
        .selectAll<SVGPathElement, any>("path")
        .data(chinaGeoData.features)
        .join("path")
        .on("click", (event: MouseEvent, d: any) => this.clicked(event, d, path))
        .attr("d", path as any)
        .attr("fill", "rgba(128, 128, 128, 0.2)")
        .attr("stroke-width", 0)
        .attr("class", "province")
        .each((d: any) => {
          d.clicked = false;
        });

      provinces.append("title").text((d: any) => d.properties.name);
    });
  }

  public renderNodes(): void {
    const transform = d3.zoomTransform(this.svg.node());

    const nodesData: NodeTable = this.ctx.data.nodes();
    const nodes = this.gNodes
      .selectAll("g") // 使用g元素包裹每个节点和标签
      .data(Object.entries(nodesData))
      .join("g")
      .attr("id", (d: any) => d[0])
      .attr(
        "transform",
        (d: any) =>
          `translate(${this.projection(d[1]["geo_info"])![0]}, ${
            this.projection(d[1]["geo_info"])![1]
          })`
      );

    // 创建标签背景和边框，确保它们处于最下层
    nodes
      .append("rect")
      .attr("x", -25 / transform.k) // 设置矩形的起始位置
      .attr("y", -20 / transform.k) // 设置矩形的起始位置
      .attr("width", 50 / transform.k) // 设置宽度
      .attr("height", 20 / transform.k) // 设置高度
      .attr("rx", 5 / transform.k) // 设置圆角
      .attr("ry", 5 / transform.k) // 设置圆角
      .style("fill", "white")
      .style("stroke", "black")
      .style("stroke-width", 1 / transform.k)
      .style("opacity", 0.7)
      .on("mouseover", (event: MouseEvent, d: any) => {
        d3.select((event.currentTarget as any).parentNode).raise();
      });

    // 绘制节点
    nodes
      .append("circle")
      .attr("id", (d: any) => `node-${d[0]}`) // 设置节点的 id 属性
      .attr("r", this.nodeRadiusEncoder(transform)) // 设置圆的半径
      .attr("fill", this.nodeColorEncoder()) // 设置圆的填充颜色
      .attr("stroke", "black") // 设置圆的边框颜色
      .attr("stroke-width", this.nodeStrokeWidthEncoder(transform, 2))
      .on("mouseover", (event: MouseEvent, d: any) => {
        console.log("[MapContext] mouseover node: ", d);
        d3.select((event.currentTarget as any).parentNode).raise();
      })
      .on("mousedown", (event: MouseEvent, d: any) => {
        // 阻止事件传播
        event.preventDefault();
        event.stopPropagation();
        console.log("[MapContext] clicked node: ", d);

        const nodeId = d[0];
        if (event.button === 0) this.ctx.choosed.setNodeFirst(nodeId);
        else if (event.button === 2) this.ctx.choosed.setNodeSecond(nodeId);
      });

    // 创建标签
    const label = nodes
      .append("text")
      .attr("x", 0) // 设置标签的偏移量
      .attr("y", -6 / transform.k)
      .attr("text-anchor", "middle")
      .style("font-size", `${12 / transform.k}px`)
      .style("cursor", "pointer")
      .text((d: any) => d[1]["name"]) // 显示节点名称
      .on("mouseover", (event: MouseEvent, d: any) => {
        d3.select((event.currentTarget as any).parentNode).raise();
      });

    // // 鼠标悬浮时显示更多信息，并调整标签样式
    // label
    //   .on("mouseover", function (event, d) {
    //     d3.select(this).style("font-weight", "bold"); // 加粗字体
    //     d3.select(this.previousElementSibling) // 获取rect元素
    //       .style("fill", "#f0f0f0") // 改变背景色
    //       .attr("width", 70) // 改变宽度
    //       .attr("height", 30); // 改变高度
    //     // 显示更多信息
    //     const info = d[1]["extra_info"] || "No additional info"; // 可以根据需要添加更多信息
    //     d3.select(this).text(info).style("font-size", "14px");
    //   })
    //   .on("mouseout", function (event, d) {
    //     d3.select(this).style("font-weight", "normal");
    //     d3.select(this.previousElementSibling)
    //       .style("fill", "white")
    //       .attr("width", 50)
    //       .attr("height", 20);
    //     d3.select(this).text(d[1]["name"]);
    //   });
  }

  onNodeFirstChange(oldNodeId: string | null, newNodeId: string | null): void {
    if (oldNodeId) d3.select(`#node-${oldNodeId}`).attr("stroke", "black");
    if (newNodeId) d3.select(`#node-${newNodeId}`).attr("stroke", "red");
  }

  onNodeSecondChange(oldNodeId: string | null, newNodeId: string | null): void {
    if (oldNodeId) d3.select(`#node-${oldNodeId}`).attr("stroke", "black");
    if (newNodeId) d3.select(`#node-${newNodeId}`).attr("stroke", "yellow");
  }

  renderLines(): void {
    const transform = d3.zoomTransform(this.svg.node());

    // 获取所有的节点数据
    const nodes = this.ctx.data.nodes();
    const adjacencyTable = this.ctx.data.adjacencyTable();

    // 遍历邻接表并根据地理信息绘制线路
    const lines: {
      id: string;
      trainShifts: number;
      source: [number, number];
      target: [number, number];
    }[] = [];

    Object.entries(adjacencyTable).forEach(([source_name, targets]) => {
      const sourceGeo = nodes[source_name]?.geo_info;
      if (sourceGeo) {
        Object.entries(targets).forEach(([target_name, edge]) => {
          const targetGeo = nodes[target_name]?.geo_info;
          if (targetGeo) {
            // 如果目标站点有地理信息，则绘制一条连接线路
            lines.push({
              id: Graph.getEdgeId(source_name, target_name),
              trainShifts: edge.trainShifts,
              source: sourceGeo,
              target: targetGeo,
            });
          }
        });
      }
    });

    // 绘制线路：每一条线连接两个站点
    const lineGenerator = d3
      .line()
      .x((d: any) => this.projection(d)![0])
      .y((d: any) => this.projection(d)![1]);

    // 使用不同的颜色区分不同的线路
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    this.gLines
      .selectAll(".train-line")
      .data(lines)
      .enter()
      .append("path")
      .attr("class", "train-line")
      .attr("d", (d: any) => lineGenerator([d.source, d.target]))
      .attr("stroke", this.lineColorEncoder()) // 线路颜色
      .attr("stroke-width", this.lineWidthEncoder(transform))
      .attr("fill", "none")
      .attr("opacity", 0.7)
      .on("mouseover", (event: MouseEvent, d: any) => {
        console.log("[MapContext] mouseover line: ", d);
      })
      .on("click", (event: MouseEvent, d: any) => {
        // 阻止事件传播
        event.stopPropagation();
        console.log("[MapContext] clicked line: ", d);
        const edgeId = d["id"];
        this.ctx.choosed.setEdge(edgeId);
      });
  }

  nodeColorEncoder(): (d: any, i: any) => string {
    // 定义一个颜色比例尺
    const colorScale = d3
      .scaleLinear<string>()
      .domain([10000, 25000]) // 假设节点的数量在 0 到 100 之间
      .range(["steelblue", "tomato"]);

    return (d: any) => {
      // 根据节点数量返回相应的颜色
      return colorScale(d[1]["access_info"]);
    };
  }

  nodeRadiusEncoder(transform: d3.ZoomTransform): (d: any, i: any) => number {
    // 定义一个半径比例尺
    const radiusScale = d3.scaleLinear<number>().domain([0, 15]).range([5, 15]);

    return (d: any) => {
      // 根据节点数量返回相应的半径
      return radiusScale(d[1]["degree"]) / transform.k;
    };
  }

  nodeStrokeWidthEncoder(transform: d3.ZoomTransform, k: number): (d: any, i: any) => number {
    return (d: any) => k / transform.k;
  }

  lineWidthEncoder(transform: d3.ZoomTransform): (d: any) => number {
    // 定义一个线宽比例尺
    const lineWidthScale = d3
      .scaleLinear<number>()
      .domain([0, 30]) // 假设节点的数量在 0 到 100 之间
      .range([1.5, 10.5]);

    return (d: any) => {
      const source = Graph.getSourceId(d.id);
      const target = Graph.getTargetId(d.id);
      const degree = this.ctx.data.nodes()[source].degree + this.ctx.data.nodes()[target].degree;
      return lineWidthScale(degree) / transform.k;
    };
  }

  lineColorEncoder(): (d: any, i: any) => string {
    // 定义一个颜色比例尺
    const colorScale = d3
      .scaleLinear<string>()
      .domain([10000, 160000])
      .range(["steelblue", "tomato"]);

    return (d: any) => {
      // 根据 trainShifts 返回相应的颜色
      return colorScale(d.trainShifts);
    };
  }

  public init(): void {
    this.svg.on("click", () => this.reset());
    this.gMap = this.g.append("g");
    this.gMapProvinces = this.gMap.append("g");
    this.gMapCounties = this.gMap.append("g");
    this.gLines = this.g.append("g");
    this.gNodes = this.g.append("g");
  }

  public render(): void {
    this.renderMap();
    this.renderLines();
    this.renderNodes();

    // 初始化缩放
    this.svg.call(this.zoom as any);
    this.svg.call(this.zoom.transform, d3.zoomTransform(this.svg.node()));
  }

  public clear(): void {
    this.g.selectAll("*").remove();
  }

  private rerenderNode(id: string): void {
    const transform = d3.zoomTransform(this.svg.node());

    // 获取指定 ID 的节点数据
    const nodeData = this.ctx.data.nodes()[id];
    if (!nodeData) {
      console.log(`[MapContext] Node with id ${id} not found.`);
      return;
    }

    // 更新指定节点的属性
    this.gNodes
      .selectAll("circle")
      .filter((d: any) => d[0] === id) // 根据 ID 过滤出对应的节点
      .attr("cx", (d: any) => this.projection(nodeData["geo_info"]!)![0]) // 更新 x 坐标
      .attr("cy", (d: any) => this.projection(nodeData["geo_info"]!)![1]) // 更新 y 坐标
      .attr("r", this.nodeRadiusEncoder(transform)) // 更新圆的半径
      .attr("fill", "blue") // 更新填充颜色（可以自定义）
      .attr("stroke", "white") // 更新边框颜色
      .attr("stroke-width", 1 / transform.k); // 更新边框宽度
  }

  private rerenderLine(id: string): void {
    const transform = d3.zoomTransform(this.svg.node());

    const adjacencyTable = this.ctx.data.adjacencyTable();
    const sourceId = Graph.getSourceId(id);
    const targetId = Graph.getTargetId(id);
    const lineData = adjacencyTable[sourceId][targetId] ?? adjacencyTable[targetId][sourceId];
    if (!lineData) {
      console.log(`[MapContext] Line with id ${id} not found.`);
      return;
    }

    const lineGenerator = d3
      .line()
      .x((d: any) => this.projection(d)![0])
      .y((d: any) => this.projection(d)![1]);

    // 更新指定线的属性
    this.gLines
      .selectAll(".train-line")
      .filter((d: any) => d[0] === id) // 根据 ID 过滤出对应的线
      .attr("d", (d: any) => {
        const sourceGeo = this.ctx.data.nodes()[sourceId]["geo_info"];
        const targetGeo = this.ctx.data.nodes()[targetId]["geo_info"];
        if (sourceGeo && targetGeo) {
          return lineGenerator([sourceGeo, targetGeo]);
        } else {
          return "";
        }
      })
      .attr("stroke", "blue") // 更新线的颜色（可以自定义）
      .attr("stroke-width", 2 / transform.k); // 更新线的宽度
  }

  public rerender(itemId: string): void {
    return Graph.isEdgeId(itemId) ? this.rerenderLine(itemId) : this.rerenderNode(itemId);
  }

  filter(itemKind: "node" | "edge", attrKind: "color" | "width", min: number, max: number): void {
    // if (itemKind === "node")
    // TODO
  }
}
