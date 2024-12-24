import * as d3 from "d3";
import { LegendContext } from "./LegendsContext";

interface PositionConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

class WidthLegend {
  private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
  private widthScale: d3.ScaleLinear<number, number>;
  private legendType: string; // "node" 或 "edge"
  private margin: PositionConfig;
  private legendWidth: number = 200;
  private legendHeight: number = 40;

  constructor(
    private ctx: LegendContext,
    svgSelector: string,
    legendType: string,
    widthScale: d3.ScaleLinear<number, number>,
    margin: PositionConfig,
    private text: string
  ) {
    this.svg = d3.select(svgSelector);
    this.legendType = legendType;
    this.widthScale = widthScale;
    this.margin = margin;
  }

  // 绘制图例
  public draw(): void {
    const legendGroup = this.svg
      .append("g")
      .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`);

    const widthBarHeight = this.widthScale.range()[1];
    const widthBarMaxWidth = this.legendWidth - 30;

    // 直角梯形
    legendGroup
      .append("g")
      .attr("transform", "translate(0, 20)")
      .append("polygon")
      .attr("points", this.getTrapezoidPoints(widthBarMaxWidth, widthBarHeight))
      .style("fill", "#ffd")
      .style("stroke", "#000");

    // 坐标轴条
    const axisScale = d3
      .scaleLinear()
      .domain(this.widthScale.domain())
      .range([0, widthBarMaxWidth]);
    legendGroup
      .append("g")
      .attr("transform", `translate(0, 30)`)
      .call(d3.axisBottom(axisScale).ticks(5))
      .selectAll("text")
      .style("font-size", "6px");

    // 添加可拖动圆点
    const dragBehavior = d3.drag<SVGCircleElement, unknown>().on("drag", (event) => {
      const x = Math.max(0, Math.min(widthBarMaxWidth, event.x));
      d3.select(event.sourceEvent.target).attr("cx", x);
      this.updateFilterFromCircles(circle1.attr("cx") as any, circle2.attr("cx") as any, axisScale);
    });

    const circle1 = legendGroup
      .append("circle")
      .attr("cx", 0)
      .attr("cy", 30)
      .attr("r", 5)
      .style("fill", "white")
      .style("stroke", "black")
      .call(dragBehavior);

    const circle2 = legendGroup
      .append("circle")
      .attr("cx", widthBarMaxWidth)
      .attr("cy", 30)
      .attr("r", 5)
      .style("fill", "white")
      .style("stroke", "black")
      .call(dragBehavior);

    // 文字标注
    legendGroup
      .append("text")
      .attr("x", 0)
      .attr("y", 10)
      .text(this.text)
      .style("font-size", "8px")
      .style("font-weight", "bold");

    // 图例展示（节点或边）
    if (this.legendType === "node") {
      this.drawNodeLegend(legendGroup, widthBarMaxWidth);
    } else if (this.legendType === "edge") {
      this.drawEdgeLegend(legendGroup, widthBarMaxWidth);
    }
  }

  // 更新范围并调用过滤方法
  private updateFilterFromCircles(
    x1: number,
    x2: number,
    scale: d3.ScaleLinear<number, number>
  ): void {
    const range = [scale.invert(+x1), scale.invert(+x2)].sort((a, b) => a - b);
    this.filter(range as [number, number]);
  }

  // 占位的过滤方法（需用户实现具体逻辑）
  public filter(range: [number, number]): void {
    this.ctx.filter(`${this.legendType}-width` as any, range);
  }

  // 获取梯形的点坐标
  private getTrapezoidPoints(width: number, height: number): string {
    const [min, max] = this.widthScale.range();
    const points = [
      `0,${10 - height}`, // 左上角
      `${width},${10 - min}`, // 右上角
      `${width},${10}`, // 右下角
      `0,${10}`, // 左下角
    ];
    return points.join(" ");
  }

  // 获取渐变ID
  private getWidthGradientId(): string {
    return `${this.legendType}WidthGradient`;
  }

  // 绘制节点宽度图例
  private drawNodeLegend(
    legendGroup: d3.Selection<SVGGElement, unknown, HTMLElement, any>,
    widthBarMaxWidth: number
  ): void {
    const [min, max] = this.widthScale.range();
    // 左右两个圆点表示最小和最大宽度
    legendGroup
      .append("circle")
      .attr("cx", -10)
      .attr("cy", 25 - max / 4)
      .attr("r", max / 2)
      .style("fill", "#ffd")
      .style("stroke", "#000");

    legendGroup
      .append("circle")
      .attr("cx", widthBarMaxWidth + 10)
      .attr("cy", 25 - min / 4)
      .attr("r", min / 2)
      .style("fill", "#ffd")
      .style("stroke", "#000");
  }

  // 绘制边宽度图例
  private drawEdgeLegend(
    legendGroup: d3.Selection<SVGGElement, unknown, HTMLElement, any>,
    widthBarMaxWidth: number
  ): void {
    const [min, max] = this.widthScale.range();
    // 左右两条竖线表示最小和最大宽度
    legendGroup
      .append("rect")
      .attr("x", -20)
      .attr("y", 10)
      .attr("width", max)
      .attr("height", 20)
      .style("fill", "#ffd")
      .style("stroke", "#000");

    legendGroup
      .append("rect")
      .attr("x", widthBarMaxWidth + 8)
      .attr("y", 10)
      .attr("width", min)
      .attr("height", 20)
      .style("fill", "#ffd")
      .style("stroke", "#000");
  }

  // 创建渐变定义
  public createGradients(): void {
    const [min, max] = this.widthScale.range();
    const gradient = this.svg
      .append("defs")
      .append("linearGradient")
      .attr("id", this.getWidthGradientId())
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "0%")
      .attr("y2", "0%");

    gradient.append("stop").attr("offset", "0%").attr("stop-color", this.widthScale(min));
    gradient.append("stop").attr("offset", "100%").attr("stop-color", this.widthScale(max));
  }
}

export { WidthLegend };
