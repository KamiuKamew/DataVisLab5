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

    const bbox = this.svg.node()?.getBoundingClientRect();
    this.width = (bbox?.width || 800) - this.margin.left - this.margin.right - 500;
    this.height = (bbox?.height || 500) - this.margin.top - this.margin.bottom - 100;

    this.svg.selectAll("*").remove();
  }

  public render(paramId: number): void {
    const data: number[] = this.extractParamData(paramId);
    const infinityCount = this.extractInfinityCount(paramId);

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
      .line<{ x0: number; x1: number; density: number }>()
      .x((d) => x((d.x0 + d.x1) / 2))
      .y((d) => y(d.density))
      .curve(d3.curveBasis);

    const g = this.svg
      .append("g")
      .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`);

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

    // Add Pachinko effect
    this.addPachinkoEffect(g, data, x, y);

    // Add Infinity column
    this.addInfinityColumn(infinityCount);
  }

  private addPachinkoEffect(
    g: d3.Selection<SVGGElement, unknown, HTMLElement, any>,
    data: number[],
    x: d3.ScaleLinear<number, number, never>,
    y: d3.ScaleLinear<number, number, never>
  ): void {
    const radius = 1;
    const dodge = this.createDodger(radius * 2 + 1);
    const height = this.height;

    const balls = g.append("g").attr("class", "pachinko-balls");

    data.forEach((value) => {
      const cx = x(value);
      const cy = height - dodge(cx) - radius - 1;

      if (cy < this.margin.top) return;

      balls
        .append("circle")
        .attr("cx", cx)
        .attr("cy", -50) // Initial position above the chart
        .attr("r", radius)
        .attr("fill", "gray")
        .attr("cy", cy); // Final position calculated by dodge
    });
  }

  private addInfinityColumn(infinityCount: number): void {
    const columnX = this.width + this.margin.right + 50; // 将柱状区域放在密度曲线的右侧
    const columnWidth = 80; // 柱状区域宽度
    const columnHeight = this.height; // 柱状区域高度
    const radius = 1; // 小球半径

    const rows = Math.floor(columnWidth / (2 * radius + 1)); // 每行最多容纳的小球数
    const maxRows = Math.floor(columnHeight / (2 * radius + 1)); // 最多容纳的行数
    const totalCapacity = rows * maxRows; // 容器最多可容纳的小球数

    if (infinityCount > totalCapacity) {
      console.warn("Infinity count exceeds column capacity. Some values will not be displayed.");
      infinityCount = totalCapacity; // 限制小球数量
    }

    const column = this.svg
      .append("g")
      .attr("transform", `translate(${columnX}, ${this.margin.top})`);

    // 使用自下向上密集排布的小球
    for (let i = 0; i < infinityCount; i++) {
      const row = Math.floor(i / rows); // 当前小球所在行
      const col = i % rows; // 当前小球所在列

      const cx = -columnWidth / 2 + radius + col * (2 * radius + 1) + 10; // 小球水平位置
      const cy = columnHeight - radius - row * (2 * radius + 1) - 1; // 小球垂直位置，从下向上堆积

      // 添加小球
      column
        .append("circle")
        .attr("cx", cx)
        .attr("cy", columnHeight + 50) // 初始位置（柱状区域底部外）
        .attr("r", radius)
        .attr("fill", "gray")
        .attr("cy", cy); // 最终位置根据排列计算
    }
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

  public clear(): void {
    this.svg.selectAll("*").remove();
  }

  private extractParamData(paramId: number): number[] {
    const result: number[] = [];

    for (const source in this.shortestPath.shortestPathTable) {
      for (const target in this.shortestPath.shortestPathTable[source]) {
        if (source === target) continue;
        const params = this.shortestPath.shortestPathTable[source][target].params;

        if (paramId >= 0 && paramId < params.length) {
          const param = params[paramId]?.param;
          if (typeof param === "number" && !isNaN(param) && param !== Infinity) {
            result.push(param);
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
