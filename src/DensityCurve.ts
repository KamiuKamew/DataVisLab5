import * as d3 from "d3";
import { ShortestPath } from "./ShortestPath";

export class DensityCurve {
  private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
  private shortestPath: ShortestPath;
  private margin = { top: 20, right: 30, bottom: 30, left: 40 };
  private width: number;
  private height: number;

  constructor(
    svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>,
    shortestPath: ShortestPath
  ) {
    this.svg = svg;
    this.shortestPath = shortestPath;

    // 动态获取 SVG 容器的宽高
    const bbox = this.svg.node()?.getBoundingClientRect();
    this.width = (bbox?.width || 800) - this.margin.left - this.margin.right - 400;
    this.height = (bbox?.height || 500) - this.margin.top - this.margin.bottom - 100;

    // Clear SVG for new rendering
    this.svg.selectAll("*").remove();

    // Append the main group element
    this.svg.append("g").attr("transform", `translate(${this.margin.left}, ${this.margin.top})`);
  }

  public render(paramId: number): void {
    const data: number[] = this.extractParamData(paramId);

    if (data.length === 0) {
      console.warn("No data available for the specified paramId.");
      return;
    }

    const x = d3
      .scaleLinear()
      .domain([d3.min(data) as number, d3.max(data) as number])
      .range([0, this.width]);

    const density = d3
      .histogram()
      .domain(x.domain() as [number, number])
      .thresholds(x.ticks(40))(data)
      .map((bin) => ({
        x0: bin.x0 as number,
        x1: bin.x1 as number,
        density: bin.length / data.length / ((bin.x1 as number) - (bin.x0 as number)),
      }));

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(density, (d) => d.density) as number])
      .range([this.height, 0]);

    const line = d3
      .line<{ x0: number; x1: number; density: number }>() // 更新类型定义，包含 x1
      .x((d) => x((d.x0 + d.x1) / 2)) // 直接使用 d.x1，而非依赖默认值
      .y((d) => y(d.density))
      .curve(d3.curveBasis);

    const g = this.svg.select("g");

    // Add x-axis
    g.append("g").attr("transform", `translate(0, ${this.height})`).call(d3.axisBottom(x));

    // Add y-axis
    g.append("g").call(d3.axisLeft(y));

    // Add line path
    g.append("path")
      .datum(density)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", line);
  }

  public clear(): void {
    this.svg.select("g").selectAll("*").remove();
  }

  private extractParamData(paramId: number): number[] {
    const result: number[] = [];

    for (const source in this.shortestPath.shortestPathTable) {
      for (const target in this.shortestPath.shortestPathTable[source]) {
        if (source === target) continue;
        const params = this.shortestPath.shortestPathTable[source][target].params;

        if (paramId >= 0 && paramId < params.length) {
          const param = params[paramId]?.param; // 使用可选链确保 param 存在
          if (
            typeof param === "number" && // 确保是数值
            !isNaN(param) && // 排除 NaN
            param !== Infinity // 排除 Infinity
          ) {
            result.push(param);
          }
        }
      }
    }

    return result;
  }
}
