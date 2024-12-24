import * as d3 from "d3";
import { ShortestPath } from "../ShortestPath";

export class DensityCurve {
  private margin = { top: 20, right: 30, bottom: 30, left: 40 };
  private width: number;
  private height: number;

  private g: d3.Selection<SVGGElement, unknown, HTMLElement, any>;
  private gCurve: d3.Selection<SVGGElement, unknown, HTMLElement, any>;
  private gxAxis: d3.Selection<SVGGElement, unknown, HTMLElement, any>;
  private gyAxis: d3.Selection<SVGGElement, unknown, HTMLElement, any>;
  private gxAxisLabel: d3.Selection<SVGTextElement, unknown, HTMLElement, any>;
  private gyAxisLabel: d3.Selection<SVGTextElement, unknown, HTMLElement, any>;
  private ginfinityLabel: d3.Selection<SVGTextElement, unknown, HTMLElement, any>;
  private gPath: d3.Selection<SVGGElement, unknown, HTMLElement, any>;
  private gBalls: d3.Selection<SVGGElement, unknown, HTMLElement, any>;
  private gPachinko: d3.Selection<SVGGElement, unknown, HTMLElement, any>;
  private gInfinity: d3.Selection<SVGGElement, unknown, HTMLElement, any>;

  constructor(
    private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>,
    private shortestPath: ShortestPath
  ) {
    this.svg.selectAll("*").remove();

    this.g = this.svg.append("g").attr("class", "g");
    this.gCurve = this.g.append("g").attr("class", "curve");
    this.gxAxis = this.gCurve.append("g").attr("class", "x-axis");
    this.gyAxis = this.gCurve.append("g").attr("class", "y-axis");
    this.gxAxisLabel = this.g.append("text").attr("class", "x-axis-label");
    this.gyAxisLabel = this.g.append("text").attr("class", "y-axis-label");
    this.ginfinityLabel = this.g.append("text").attr("class", "infinity-label");
    this.gPath = this.gCurve.append("g").attr("class", "path");
    this.gBalls = this.g.append("g").attr("class", "balls");
    this.gPachinko = this.gBalls.append("g").attr("class", "pachinko-balls");
    this.gInfinity = this.gBalls.append("g").attr("class", "infinity-balls");

    const bbox = this.svg.node()?.getBoundingClientRect();
    this.width = (bbox?.width || 800) - this.margin.left - this.margin.right - 200;
    this.height = (bbox?.height || 500) - this.margin.top - this.margin.bottom - 100;
  }

  public render(paramId: number): void {
    const data: { id: string; value: number }[] = this.extractParamData(paramId);
    const infinityCount = this.extractInfinityCount(paramId);

    if (data.length === 0) {
      console.warn("No data available for the specified paramId.");
      return;
    }

    // Scale definitions
    const x = d3
      .scaleLinear()
      .domain([d3.min(data, (d) => d.value) as number, d3.max(data, (d) => d.value) as number])
      .range([0, this.width]);

    const density = d3
      .histogram()
      .domain(x.domain() as [number, number])
      .thresholds(x.ticks(40))(data.map((d) => d.value))
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
      .line<{ x0: number; x1: number; density: number }>()
      .x((d) => x((d.x0 + d.x1) / 2))
      .y((d) => y(d.density))
      .curve(d3.curveBasis);

    this.g.attr("transform", `translate(${this.margin.left}, ${this.margin.top})`);

    this.gxAxis
      .attr("transform", `translate(0, ${this.height})`)
      .transition()
      .duration(1000)
      .call(d3.axisBottom(x).tickSizeOuter(0))
      .selection();

    this.gyAxis.transition().duration(1000).call(d3.axisLeft(y).tickSizeOuter(0)).selection();

    // Update line path with animation
    const linePath = this.gPath.select("path");

    if (linePath.empty()) {
      // If path doesn't exist, append a new one
      this.gPath
        .append("path")
        .datum(density)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr("d", line); // Initial render
    } else {
      // Update existing path with transition
      linePath.datum(density).transition().duration(1000).attr("d", line);
    }

    // Update balls
    this.updateBalls(data, infinityCount, x, y);

    // Add x-axis label
    this.gxAxisLabel
      .data([null]) // Bind data to avoid duplicate labels
      .join(
        (enter) => enter.append("text").attr("class", "x-axis-label"),
        (update) => update,
        (exit) => exit.remove()
      )
      .attr("text-anchor", "middle")
      .attr("x", -20)
      .attr("y", -5)
      .style("font-size", "10px")
      .selectAll("tspan")
      .data(["客流密度", "/(万人/km)"]) // Multi-line text content for x-axis (currently single-line)
      .join(
        (enter) => enter.append("tspan"),
        (update) => update,
        (exit) => exit.remove()
      )
      .attr("x", -20) // Ensure proper alignment for each line
      .attr("y", -12)
      .attr("dy", (d, i) => (i === 0 ? 0 : 12)) // Adjust line spacing
      .text((d) => d);

    // Add y-axis label
    this.gyAxisLabel
      .data([null])
      .join(
        (enter) => enter.append("text").attr("class", "y-axis-label"),
        (update) => update,
        (exit) => exit.remove()
      )
      .attr("text-anchor", "middle")
      .attr("x", this.width + 100)
      .attr("y", this.height + 15)
      .style("font-size", "10px")
      .selectAll("tspan")
      .data(["里程数", "/km"]) // Multi-line text content for y-axis
      .join(
        (enter) => enter.append("tspan"),
        (update) => update,
        (exit) => exit.remove()
      )
      .attr("y", this.height + 10)
      .attr("x", this.width + 90) // Keep lines aligned
      .attr("dy", (d, i) => (i === 0 ? 0 : 12)) // Adjust line spacing for each line
      .text((d) => d);

    // Add Infinity label
    this.ginfinityLabel
      .data([null])
      .join(
        (enter) => enter.append("text").attr("class", "infinity-label"),
        (update) => update,
        (exit) => exit.remove()
      )
      .attr("text-anchor", "middle")
      .attr("x", this.width + 40)
      .attr("y", this.height + 15)
      .style("font-size", "10")
      .text("Infinity");
  }

  private updateBalls(
    data: { id: string; value: number }[],
    infinityCount: number,
    x: d3.ScaleLinear<number, number, never>,
    y: d3.ScaleLinear<number, number, never>
  ): void {
    const radius = 1;
    const dodge = this.createDodger(radius * 2 + 1);
    const height = this.height;

    // Calculate Infinity column layout
    const columnX = this.width + this.margin.right; // Infinity column X
    const columnWidth = 60; // Column width
    const columnHeight = this.height; // Column height
    const rows = Math.floor(columnWidth / (2 * radius + 1)); // Balls per row
    const maxRows = Math.floor(columnHeight / (2 * radius + 1)); // Max rows
    const totalCapacity = rows * maxRows; // Max capacity

    if (infinityCount > totalCapacity) {
      console.warn("Infinity count exceeds column capacity. Some values will not be displayed.");
      infinityCount = totalCapacity;
    }

    const infinityBalls = Array.from({ length: infinityCount }, (_, i) => {
      const row = Math.floor(i / rows);
      const col = i % rows;

      return {
        id: `infinity-${i}`,
        cx: columnX - columnWidth / 2 + radius + col * (2 * radius + 1) + 10,
        cy: columnHeight - radius - row * (2 * radius + 1) - 1,
      };
    });

    // Merge Pachinko and Infinity data
    const mergedData = [
      ...data.map((d) => ({
        id: d.id,
        cx: x(d.value),
        cy: height - dodge(x(d.value)) - radius - 1,
      })),
      ...infinityBalls,
    ];

    // Bind data to circles
    const ballsGroup = this.svg.select(".balls");
    const circles = ballsGroup
      .selectAll<SVGCircleElement, { id: string; cx: number; cy: number }>("circle")
      .data(mergedData, (d) => d.id); // Use id as key for data binding

    // ENTER: Add new balls
    circles
      .enter()
      .append("circle")
      .attr("r", radius)
      .attr("fill", "gray")
      .attr("cx", (d) => d.cx) // Initial position
      .attr("cy", -50) // Start above the chart
      .transition()
      .duration(1000)
      .attr("cx", (d) => d.cx) // Move to final position
      .attr("cy", (d) => d.cy);

    // UPDATE: Move existing balls
    circles
      .transition()
      .duration(1000)
      .attr("cx", (d) => d.cx) // Update position
      .attr("cy", (d) => d.cy);

    // EXIT: Remove old balls
    circles
      .exit()
      .transition()
      .duration(1000)
      .attr("cy", this.height + 50) // Exit below the chart
      .remove();
  }

  private createDodger(radius: number) {
    const radius2 = radius ** 2;
    const bisect = d3.bisector((d: { x: number; y: number }) => d.x);
    const circles: { x: number; y: number }[] = [];

    return (x: number) => {
      const l = bisect.left(circles, x - radius);
      const r = bisect.right(circles, x + radius, l);
      let y = 0;

      for (let i = l; i < r; ++i) {
        const { x: xi, y: yi } = circles[i];
        const x2 = (xi - x) ** 2;
        const y2 = (yi - y) ** 2;

        if (radius2 > x2 + y2) {
          y = yi + Math.sqrt(radius2 - x2) + 1e-6;
          i = l - 1; // Restart the loop to check again
          continue;
        }
      }

      circles.splice(bisect.left(circles, x, l, r), 0, { x, y });
      return y;
    };
  }

  private extractParamData(paramId: number): { id: string; value: number }[] {
    const result: { id: string; value: number }[] = [];

    for (const source in this.shortestPath.shortestPathTable) {
      for (const target in this.shortestPath.shortestPathTable[source]) {
        if (source === target) continue;
        const id = this.shortestPath.shortestPathTable[source][target].id;
        const params = this.shortestPath.shortestPathTable[source][target].params;

        if (paramId >= 0 && paramId < params.length) {
          const value = params[paramId]?.param;
          if (typeof value === "number" && !isNaN(value) && value !== Infinity) {
            result.push({ id, value });
          }
        }
      }
    }

    return result;
  }

  private extractInfinityCount(paramId: number): number {
    let count = 0;

    for (const source in this.shortestPath.shortestPathTable) {
      for (const target in this.shortestPath.shortestPathTable[source]) {
        if (source === target) continue;
        const params = this.shortestPath.shortestPathTable[source][target].params;

        if (paramId >= 0 && paramId < params.length) {
          const param = params[paramId]?.param;
          if (param === Infinity) {
            count++;
          }
        }
      }
    }

    return count;
  }
}
