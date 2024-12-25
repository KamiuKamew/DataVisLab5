import * as d3 from "d3";
import { ShortestPath, ShortestPathTable } from "../ShortestPath";
import { Context } from "../Context";
import { Graph } from "../GraphView/Basic/Graph";

export class HeatMap {
  private margin = { top: 20, right: 30, bottom: 30, left: 40 };
  private width: number;
  private height: number;
  private infoGroup: d3.Selection<SVGGElement, unknown, HTMLElement, any>;

  constructor(
    private ctx: Context,
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>,
    private shortestPath: ShortestPath
  ) {
    this.svg = svg;
    this.shortestPath = shortestPath;

    const bbox = this.svg.node()?.getBoundingClientRect();
    this.width = (bbox?.width || 800) - this.margin.left - this.margin.right - 100;
    this.height = (bbox?.height || 500) - this.margin.top - this.margin.bottom + 200;

    // Clear SVG for new rendering
    this.svg.selectAll("*").remove();

    // Append the main group element
    this.svg
      .append("g")
      .attr("transform", `translate(${this.margin.left}, ${this.margin.top + 80})`);

    // Add a group for displaying cell info
    this.infoGroup = this.svg.append("g").attr("class", "cell-info").style("visibility", "hidden");
  }

  public render(paramId: number): void {
    const data: ShortestPathTable = this.shortestPath.shortestPathTable;
    const sources = Object.keys(data);
    const targets = new Set<string>();
    sources.forEach((source) => {
      Object.keys(data[source]).forEach((target) => targets.add(target));
    });
    const targetArray = Array.from(targets);

    const xScale = d3.scaleBand().domain(sources).range([0, this.width]).padding(0.1);
    const yScale = d3.scaleBand().domain(targetArray).range([0, this.height]).padding(0.1);

    const flattenedData = [];
    for (const source of sources) {
      for (const target of targetArray) {
        if (data[source] && data[source][target]) {
          const param = data[source][target].params[paramId]?.param;
          flattenedData.push({
            source,
            target,
            param: param === undefined ? Infinity : param,
          });
        } else {
          flattenedData.push({ source, target, param: Infinity });
        }
      }
    }

    const maxParam = d3.max(flattenedData, (d) => (d.param !== Infinity ? d.param : 0)) || 1;
    const colorScale = d3.scaleSequential(d3.interpolateReds).domain([0, maxParam]);

    const g = this.svg.select("g");

    const self = this;

    g.selectAll("rect")
      .data(flattenedData)
      .enter()
      .append("rect")
      .attr("x", (d) => xScale(d.source)!)
      .attr("y", (d) => yScale(d.target)!)
      .attr("width", xScale.bandwidth())
      .attr("height", yScale.bandwidth())
      .attr("fill", (d) => (d.param === Infinity ? "black" : colorScale(d.param)))
      .attr("class", (d) => `cell-${d.source}-${d.target}`.replace(/\s+/g, "-"))
      .on("mouseenter", function (event, d) {
        event.preventDefault();
        event.stopPropagation();

        const cell = d3.select(this);

        // 将当前元素移到最顶层
        cell.raise();

        // 放大格子
        cell
          .transition()
          .duration(200)
          .attr("transform", `scale(2)`)
          .attr(
            "transform-origin",
            `${xScale(d.source)! + xScale.bandwidth() / 2}px ${
              yScale(d.target)! + yScale.bandwidth() / 2
            }px`
          );

        // Display cell info
        self.displayCellInfo(d, xScale(d.source)!, yScale(d.target)!);
      })
      .on("mouseleave", (event, d) => {
        const cell = d3.select(event.target);

        // Restore size
        cell.transition().duration(200).attr("transform", "scale(1)");

        // Hide cell info
        this.hideCellInfo();
      })
      .on("click", (event, d) => {
        this.ctx.choosed.setPath({
          id: Graph.getEdgeId(d.source, d.target),
          name: Graph.getEdgeId(d.source, d.target),
          params: this.ctx.shortestPath.get(d.source, d.target, 0),
        });
      });

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    g.append("g")
      .attr("transform", `translate(0, ${this.height})`)
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-0.8em")
      .attr("dy", "-0.5em")
      .attr("transform", "rotate(-90)");

    g.append("g").call(yAxis);

    this.renderLegend(colorScale);
  }

  private renderLegend(colorScale: d3.ScaleSequential<string, number>): void {
    const legendWidth = 200;
    const legendHeight = 20;
    const legendSvg = this.svg
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${this.margin.left}, 50)`);

    legendSvg
      .append("text")
      .attr("x", 0)
      .attr("y", -10)
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .style("text-anchor", "start")
      .text("颜色映射：里程数（单位：千米）");

    const legendScale = d3.scaleLinear().domain(colorScale.domain()).range([0, legendWidth]);
    const legendAxis = d3.axisBottom(legendScale).ticks(5);

    const numStops = 10;
    const gradientStops = d3.range(0, 1 + 1e-6, 1 / (numStops - 1)).map((t) => ({
      offset: `${t * 100}%`,
      color: d3.interpolateReds(t),
    }));

    const legendGradient = legendSvg
      .append("defs")
      .append("linearGradient")
      .attr("id", "legendGradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    gradientStops.forEach((stop) => {
      legendGradient.append("stop").attr("offset", stop.offset).attr("stop-color", stop.color);
    });

    legendSvg
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legendGradient)");

    legendSvg.append("g").attr("transform", `translate(0, ${legendHeight})`).call(legendAxis);

    legendSvg
      .append("rect")
      .attr("x", legendWidth + 20)
      .attr("y", 0)
      .attr("width", legendHeight)
      .attr("height", legendHeight)
      .style("fill", "black");

    legendSvg
      .append("text")
      .attr("x", legendWidth + 25)
      .attr("y", legendHeight + 13)
      .style("alignment-baseline", "middle")
      .style("font-size", "10px")
      .text("∞");
  }

  private displayCellInfo(
    d: { source: string; target: string; param: number },
    x: number,
    y: number
  ): void {
    this.infoGroup
      .style("visibility", "visible")
      .attr("transform", `translate(${x + 50}, ${y + 40})`);

    this.infoGroup.selectAll("*").remove();

    this.infoGroup
      .append("rect")
      .attr("width", 150)
      .attr("height", 50)
      .attr("fill", "white")
      .attr("stroke", "black")
      .attr("rx", 5);

    this.infoGroup
      .append("text")
      .attr("x", 10)
      .attr("y", 20)
      .style("font-size", "12px")
      .text(`线路: ${d.source}-${d.target}`);

    this.infoGroup
      .append("text")
      .attr("x", 10)
      .attr("y", 40)
      .style("font-size", "12px")
      .text(`里程: ${d.param === Infinity ? "∞" : `${d.param.toFixed(1)} km`}`);
  }

  private hideCellInfo(): void {
    this.infoGroup.style("visibility", "hidden");
  }

  public clear(): void {
    // Clear SVG for new rendering
    this.svg.select("g").selectAll("*").remove();
    this.svg.select(".legend").remove();
  }

  public highlightCell(source: string, target: string): void {
    console.log("[HeatMap] Highlight cell", source, target);
    // Clear previous highlights
    this.svg.selectAll("rect").style("stroke", "none");

    // Highlight the specific cell
    const cellClass = `.cell-${source}-${target}`.replace(/\s+/g, "-");
    this.svg.select(cellClass).style("stroke", "steelblue").style("stroke-width", "2px");
  }

  public clearHighlight(): void {
    // Clear previous highlights
    this.svg.selectAll("rect").style("stroke", "none");
  }
}
