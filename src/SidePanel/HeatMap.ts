import * as d3 from "d3";
import { ShortestPath, ShortestPathTable } from "../ShortestPath";
import { Context } from "../Context";
import { Graph } from "../GraphView/Basic/Graph";

export class HeatMap {
  private margin = { top: 20, right: 30, bottom: 30, left: 40 };
  private width: number;
  private height: number;

  constructor(
    private ctx: Context,
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>,
    private shortestPath: ShortestPath
  ) {
    this.svg = svg;
    this.shortestPath = shortestPath;

    // 动态获取 SVG 容器的宽高
    const bbox = this.svg.node()?.getBoundingClientRect();
    this.width = (bbox?.width || 800) - this.margin.left - this.margin.right - 100;
    this.height = (bbox?.height || 500) - this.margin.top - this.margin.bottom + 200;

    // Clear SVG for new rendering
    this.svg.selectAll("*").remove();

    // Append the main group element
    this.svg
      .append("g")
      .attr("transform", `translate(${this.margin.left}, ${this.margin.top + 80})`);
  }

  g.selectAll("g.cell-container")
  .data(flattenedData)
  .enter()
  .append("g")
  .attr("class", (d) => `cell-container-${d.source}-${d.target}`.replace(/\s+/g, "-"))
  .style("pointer-events", "none") // 禁止与鼠标交互
  .each(function (d) {
    const container = d3.select(this);

    // 背景 rect
    container
      .append("rect")
      .attr("x", xScale(d.source)!)
      .attr("y", yScale(d.target)!)
      .attr("width", xScale.bandwidth())
      .attr("height", yScale.bandwidth())
      .attr("fill", (d) => (d.param === Infinity ? "black" : colorScale(d.param)))
      .style("opacity", 0); // 默认隐藏

    // 背景 text
    container
      .append("text")
      .attr("x", xScale(d.source)! + xScale.bandwidth() / 2)
      .attr("y", yScale(d.target)! + yScale.bandwidth() / 2)
      .attr("class", "cell-text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .style("font-size", "16px")
      .style("fill", "white")
      .style("opacity", 0) // 默认隐藏
      .text(`${d.source}-${d.target}`);
  });

g.selectAll("rect.foreground")
  .data(flattenedData)
  .enter()
  .append("rect")
  .attr("class", (d) => `foreground-${d.source}-${d.target}`.replace(/\s+/g, "-"))
  .attr("x", (d) => xScale(d.source)!)
  .attr("y", (d) => yScale(d.target)!)
  .attr("width", xScale.bandwidth())
  .attr("height", yScale.bandwidth())
  .attr("fill", (d) => (d.param === Infinity ? "black" : colorScale(d.param)))
  .on("mouseenter", function (event, d) {
    const container = g.select(`.cell-container-${d.source}-${d.target}`);

    // 将当前 g 移动到最顶层
    container.raise();

    // 显示并放大背景
    container.select("rect")
      .transition()
      .duration(200)
      .style("opacity", 1)
      .attr("transform", `scale(1.5)`)
      .attr(
        "transform-origin",
        `${xScale(d.source)! + xScale.bandwidth() / 2}px ${yScale(d.target)! + yScale.bandwidth() / 2}px`
      );

    container.select("text")
      .transition()
      .duration(200)
      .style("opacity", 1)
      .style("font-size", "20px");
  })
  .on("mouseleave", function (event, d) {
    const container = g.select(`.cell-container-${d.source}-${d.target}`);

    // 隐藏背景
    container.select("rect")
      .transition()
      .duration(200)
      .style("opacity", 0)
      .attr("transform", `scale(1)`);

    container.select("text")
      .transition()
      .duration(200)
      .style("opacity", 0)
      .style("font-size", "16px");
  })
  .on("click", (event, d) => {
    this.ctx.choosed.setPath({
      id: Graph.getEdgeId(d.source, d.target),
      name: Graph.getEdgeId(d.source, d.target),
      params: this.ctx.shortestPath.get(d.source, d.target, 0),
    });
  });


    // 绘制图例条
    legendSvg
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legendGradient)");

    // 绘制图例轴
    legendSvg.append("g").attr("transform", `translate(0, ${legendHeight})`).call(legendAxis);
  }

  public clear(): void {
    // Clear SVG for new rendering
    this.svg.select("g").selectAll("*").remove();
    this.svg.select(".legend").remove();
  }

  public highlightCell(source: string, target: string): void {
    // Clear previous highlights
    this.svg.selectAll("rect").style("stroke", "none");

    // Highlight the specific cell
    const cellClass = `.cell-${source}-${target}`.replace(/\s+/g, "-");
    this.svg.select(cellClass).style("stroke", "red").style("stroke-width", "0.5px");
  }

  public clearHighlight(): void {
    // Clear previous highlights
    this.svg.selectAll("rect").style("stroke", "none");
  }
}
