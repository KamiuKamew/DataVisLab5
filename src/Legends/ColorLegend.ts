import * as d3 from "d3";

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
    svgSelector: string,
    legendType: string,
    colorScale: d3.ScaleLinear<number, number>,
    margin: PositionConfig
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
    legendGroup
      .append("g")
      .attr("transform", `translate(0, 30)`)
      .call(
        d3
          .axisBottom(d3.scaleLinear().domain(this.colorScale.domain()).range([0, colorBarWidth]))
          .ticks(5)
      );

    // 文字标注
    legendGroup
      .append("text")
      .attr("x", 0)
      .attr("y", 10)
      .text(`${this.legendType.charAt(0).toUpperCase() + this.legendType.slice(1)} Color Mapping`)
      .style("font-size", "8px")
      .style("font-weight", "bold");

    // 图例展示（节点或边）
    if (this.legendType === "node") {
      this.drawNodeLegend(legendGroup, colorBarWidth);
    } else if (this.legendType === "edge") {
      this.drawEdgeLegend(legendGroup, colorBarWidth);
    }
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
    // 左右两个圆点
    legendGroup
      .append("circle")
      .attr("cx", -10)
      .attr("cy", 25)
      .attr("r", 7)
      .style("fill", this.colorScale(0));

    legendGroup
      .append("circle")
      .attr("cx", colorBarWidth + 10)
      .attr("cy", 25)
      .attr("r", 7)
      .style("fill", this.colorScale(1));
  }

  // 绘制边颜色图例
  private drawEdgeLegend(
    legendGroup: d3.Selection<SVGGElement, unknown, HTMLElement, any>,
    colorBarWidth: number
  ): void {
    // 左右两条竖线
    legendGroup
      .append("rect")
      .attr("x", -12)
      .attr("y", 15)
      .attr("width", 4)
      .attr("height", 20)
      .style("fill", this.colorScale(0));

    legendGroup
      .append("rect")
      .attr("x", colorBarWidth + 8)
      .attr("y", 15)
      .attr("width", 4)
      .attr("height", 20)
      .style("fill", this.colorScale(1));
  }

  // 创建渐变定义
  public createGradients(): void {
    const gradient = this.svg
      .append("defs")
      .append("linearGradient")
      .attr("id", this.getColorGradientId())
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "0%")
      .attr("y2", "0%");

    gradient.append("stop").attr("offset", "0%").attr("stop-color", this.colorScale(0));
    gradient.append("stop").attr("offset", "100%").attr("stop-color", this.colorScale(1));
  }
}

export { ColorLegend };

// 设置颜色映射
const nodeColorScale = d3
  .scaleLinear()
  .domain([0, 1])
  .range(["blue", "red"] as any);
const edgeColorScale = d3
  .scaleLinear()
  .domain([0, 1])
  .range(["green", "yellow"] as any);

// 创建ColorLegend实例
const nodeLegend = new ColorLegend("svg", "node", nodeColorScale, {
  top: 20,
  right: 20,
  bottom: 20,
  left: 60,
});

// 创建渐变
nodeLegend.createGradients();

// 绘制节点颜色图例
nodeLegend.draw();

// 创建ColorLegend实例
const edgeLegend = new ColorLegend("svg", "edge", edgeColorScale, {
  top: 80,
  right: 20,
  bottom: 20,
  left: 60,
});

// 创建渐变
edgeLegend.createGradients();

// 绘制边颜色图例
edgeLegend.draw();
