import * as d3 from "d3";
import { LegendContext } from "./LegendsContext";

interface PositionConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

class ColorLegend {
  private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
  private colorScale: d3.ScaleLinear<number, number>;
  private legendType: string; // "node" 或 "edge"
  private margin: PositionConfig;
  private legendWidth: number = 200;
  private legendHeight: number = 40;

  constructor(
    private ctx: LegendContext,
    svgSelector: string,
    legendType: string,
    colorScale: d3.ScaleLinear<number, number>,
    margin: PositionConfig,
    private text: string
  ) {
    this.svg = d3.select(svgSelector);
    this.legendType = legendType;
    this.colorScale = colorScale;
    this.margin = margin;
  }

  // 绘制图例
  public draw(): void {
    const legendGroup = this.svg
      .append("g")
      .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`);

    const colorBarWidth = this.legendWidth - 30;
    const colorBarHeight = 10;

    // 颜色条
    legendGroup
      .append("g")
      .attr("transform", "translate(0, 20)")
      .append("rect")
      .attr("width", colorBarWidth)
      .attr("height", colorBarHeight)
      .style("fill", `url(#${this.getColorGradientId()})`);

    // 坐标轴条
    const axisScale = d3.scaleLinear().domain(this.colorScale.domain()).range([0, colorBarWidth]);
    legendGroup
      .append("g")
      .attr("transform", `translate(0, 30)`)
      .call(d3.axisBottom(axisScale).ticks(5))
      .selectAll("text")
      .style("font-size", "6px");

    // 添加可拖动圆点
    const dragBehavior = d3.drag<SVGCircleElement, unknown>().on("drag", (event) => {
      const x = Math.max(0, Math.min(colorBarWidth, event.x));
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
      .attr("cx", colorBarWidth)
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
      this.drawNodeLegend(legendGroup, colorBarWidth);
    } else if (this.legendType === "edge") {
      this.drawEdgeLegend(legendGroup, colorBarWidth);
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

  public filter(range: [number, number]): void {
    this.ctx.filter(`${this.legendType}-color` as any, range);
  }

  // 获取渐变ID
  private getColorGradientId(): string {
    return `${this.legendType}ColorGradient`;
  }

  // 绘制节点颜色图例
  private drawNodeLegend(
    legendGroup: d3.Selection<SVGGElement, unknown, HTMLElement, any>,
    colorBarWidth: number
  ): void {
    const [min, max] = this.colorScale.domain();
    // 左右两个圆点
    legendGroup
      .append("circle")
      .attr("cx", -10)
      .attr("cy", 25)
      .attr("r", 7)
      .style("fill", this.colorScale(min));

    legendGroup
      .append("circle")
      .attr("cx", colorBarWidth + 10)
      .attr("cy", 25)
      .attr("r", 7)
      .style("fill", this.colorScale(max));
  }

  // 绘制边颜色图例
  private drawEdgeLegend(
    legendGroup: d3.Selection<SVGGElement, unknown, HTMLElement, any>,
    colorBarWidth: number
  ): void {
    const [min, max] = this.colorScale.domain();
    // 左右两条竖线
    legendGroup
      .append("rect")
      .attr("x", -12)
      .attr("y", 15)
      .attr("width", 4)
      .attr("height", 20)
      .style("fill", this.colorScale(min));

    legendGroup
      .append("rect")
      .attr("x", colorBarWidth + 8)
      .attr("y", 15)
      .attr("width", 4)
      .attr("height", 20)
      .style("fill", this.colorScale(max));
  }

  // 创建渐变定义
  public createGradients(): void {
    const [min, max] = this.colorScale.domain();
    const gradient = this.svg
      .append("defs")
      .append("linearGradient")
      .attr("id", this.getColorGradientId())
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "0%")
      .attr("y2", "0%");

    gradient.append("stop").attr("offset", "0%").attr("stop-color", this.colorScale(min));
    gradient.append("stop").attr("offset", "100%").attr("stop-color", this.colorScale(max));
  }
}

export { ColorLegend };
