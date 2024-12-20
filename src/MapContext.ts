import * as d3 from "d3";
import { Context } from "./Context";
import { NodeTable } from "./Data";
import { Names } from "./Names";
import { Graph } from "./Graph/Basic/Graph";

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
    this.gMap.selectAll(".province").attr("stroke-width", 2 / transform.k);
    this.gMap.selectAll(".state").attr("stroke-width", 0.5 / transform.k);

    // 调整节点大小，使其始终保持相同的视觉大小
    this.gNodes
      .selectAll("circle")
      .attr("r", 5 / transform.k)
      .attr("stroke-width", 1 / transform.k); // 这里的 5 是节点的默认半径

    // 调整线的粗细
    this.gLines.selectAll("path").attr("stroke-width", 2 / transform.k);
  }

  public renderMap(): void {
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
            .attr("stroke-width", 0.5)
            .attr("fill", "rgba(0, 0, 0, 0.2)")
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
        .attr("fill", "rgba(0, 0, 0, 0.2)")
        .attr("class", "province")
        .attr(Names.DataCategory, Names.DataCategory_Province)
        .each((d: any) => {
          d.clicked = false;
        });

      provinces.append("title").text((d: any) => d.properties.name);
    });
  }

  public renderNodes(): void {
    const transform = d3.zoomTransform(this.svg.node());

    const nodesData: NodeTable = this.ctx.data.nodes();
    this.gNodes
      .selectAll("circle")
      .data(Object.entries(nodesData))
      .join("circle")
      .attr("cx", (d: any) => this.projection(d[1]["geo_info"])![0]) // x 坐标
      .attr("cy", (d: any) => this.projection(d[1]["geo_info"])![1]) // y 坐标
      .attr("r", 5 / transform.k) // 设置圆的半径
      .attr("fill", "red") // 设置圆的填充颜色
      .attr("stroke", "white") // 设置圆的边框颜色
      .attr("stroke-width", 1 / transform.k)
      // .attr(Names.DataCategory, Names.DataCategory_Station)
      .on("mouseover", (event: MouseEvent, d: any) => {
        console.log("[MapContext] mouseover node: ", d);
      })
      .on("click", (event: MouseEvent, d: any) => {
        // 阻止事件传播
        event.stopPropagation();
        console.log("[MapContext] clicked node: ", d);
        this.ctx.exploreParams(Names.DataCategory_Station, d[0]);
      });
  }

  renderLines(): void {
    const transform = d3.zoomTransform(this.svg.node());

    // 获取所有的节点数据
    const nodes = this.ctx.data.nodes();
    const adjacencyTable = this.ctx.data.adjacencyTable();

    // 遍历邻接表并根据地理信息绘制线路
    const lines: { id: string; source: [number, number]; target: [number, number] }[] = [];

    Object.entries(adjacencyTable).forEach(([source_name, targets]) => {
      const sourceGeo = nodes[source_name]?.geo_info;
      if (sourceGeo) {
        Object.entries(targets).forEach(([target_name, edge]) => {
          const targetGeo = nodes[target_name]?.geo_info;
          if (targetGeo) {
            // 如果目标站点有地理信息，则绘制一条连接线路
            lines.push({
              id: Graph.getEdgeId(source_name, target_name),
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
      .attr("stroke", (d: any, i: any) => colorScale(i)) // 线路颜色
      .attr("stroke-width", 2 / transform.k)
      .attr("fill", "none")
      .attr("opacity", 0.7)
      .attr(Names.DataCategory, Names.DataCategory_Track)
      .on("mouseover", (event: MouseEvent, d: any) => {
        console.log("[MapContext] mouseover line: ", d);
      })
      .on("click", (event: MouseEvent, d: any) => {
        // 阻止事件传播
        event.stopPropagation();
        console.log("[MapContext] clicked line: ", d);
        this.ctx.exploreParams(Names.DataCategory_Track, d["id"]);
      });
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
      .attr("r", 5 / transform.k) // 更新圆的半径
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

  public rerender(dataCategory: string, id: string): void {
    if (dataCategory === Names.DataCategory_Station) this.rerenderNode(id);
    else if (dataCategory === Names.DataCategory_Track) this.rerenderLine(id);
  }
}
