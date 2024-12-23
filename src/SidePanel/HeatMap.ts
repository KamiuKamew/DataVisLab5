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
    this.svg.append("g").attr("transform", `translate(${this.margin.left}, ${this.margin.top})`);
  }

  public render(paramId: number): void {
    const data: ShortestPathTable = this.shortestPath.shortestPathTable;

    // Get all unique source and target names
    const sources = Object.keys(data);
    const targets = new Set<string>();
    sources.forEach((source) => {
      Object.keys(data[source]).forEach((target) => targets.add(target));
    });

    const targetArray = Array.from(targets);

    // Set up scales
    const xScale = d3.scaleBand().domain(sources).range([0, this.width]).padding(0.1);
    const yScale = d3.scaleBand().domain(targetArray).range([0, this.height]).padding(0.1);

    // Flatten the data into an array for easier mapping
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

    // Determine color scale
    const maxParam = d3.max(flattenedData, (d) => (d.param !== Infinity ? d.param : 0)) || 1;
    const colorScale = d3.scaleSequential(d3.interpolateReds).domain([0, maxParam]);

    // Draw the heatmap
    const g = this.svg.select("g");

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
      .on("click", (event, d) => {
        // Trigger setPath with appropriate parameters
        this.ctx.choosed.setPath({
          id: Graph.getEdgeId(d.source, d.target),
          name: Graph.getEdgeId(d.source, d.target),
          params: this.ctx.shortestPath.get(d.source, d.target, 0),
        });
      }); // Add click event listener

    // Add axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    g.append("g")
      .attr("transform", `translate(0, ${this.height})`)
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-0.8em")
      .attr("dy", "0.15em")
      .attr("transform", "rotate(-45)");

    g.append("g").call(yAxis);

    // Add a color legend
    const legendWidth = 200;
    const legendHeight = 20;

    const legendSvg = this.svg
      .append("g")
      .attr("transform", `translate(${this.margin.left}, ${this.height + 40})`);

    const legendScale = d3.scaleLinear().domain([0, maxParam]).range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale).ticks(5);

    const legendGradient = legendSvg
      .append("defs")
      .append("linearGradient")
      .attr("id", "legendGradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    legendGradient.append("stop").attr("offset", "0%").attr("stop-color", d3.interpolateReds(0));

    legendGradient.append("stop").attr("offset", "100%").attr("stop-color", d3.interpolateReds(1));

    legendSvg
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legendGradient)");

    legendSvg.append("g").attr("transform", `translate(0, ${legendHeight})`).call(legendAxis);
  }

  public clear(): void {
    // Clear SVG for new rendering
    this.svg.select("g").selectAll("*").remove();
  }

  public highlightCell(source: string, target: string): void {
    // Clear previous highlights
    this.svg.selectAll("rect").style("stroke", "none");

    // Highlight the specific cell
    const cellClass = `.cell-${source}-${target}`.replace(/\s+/g, "-");
    this.svg.select(cellClass).style("stroke", "blue").style("stroke-width", "2px");
  }

  public clearHighlight(): void {
    // Clear previous highlights
    this.svg.selectAll("rect").style("stroke", "none");
  }
}
