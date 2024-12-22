import * as d3 from "d3";

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
    svgSelector: string,
    legendType: string,
    widthScale: d3.ScaleLinear<number, number>,
    margin: PositionConfig
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

    const widthBarHeight = 10;
    const widthBarMaxWidth = this.legendWidth - 30;

    // 直角梯形
    legendGroup
      .append("g")
      .attr("transform", "translate(0, 20)")
      .append("polygon")
      .attr("points", this.getTrapezoidPoints(widthBarMaxWidth, widthBarHeight))
      .style("fill", `url(#${this.getWidthGradientId()})`);

    // 坐标轴条
    legendGroup
      .append("g")
      .attr("transform", `translate(0, 30)`)
      .call(
        d3
          .axisBottom(
            d3.scaleLinear().domain(this.widthScale.domain()).range([0, widthBarMaxWidth])
          )
          .ticks(5)
      );

    // 文字标注
    legendGroup
      .append("text")
      .attr("x", 0)
      .attr("y", 10)
      .text(`${this.legendType.charAt(0).toUpperCase() + this.legendType.slice(1)} Width Mapping`)
      .style("font-size", "8px")
      .style("font-weight", "bold");

    // 图例展示（节点或边）
    if (this.legendType === "node") {
      this.drawNodeLegend(legendGroup, widthBarMaxWidth);
    } else if (this.legendType === "edge") {
      this.drawEdgeLegend(legendGroup, widthBarMaxWidth);
    }
  }

  // 获取梯形的点坐标
  private getTrapezoidPoints(width: number, height: number): string {
    const topWidth = width * 0.5; // 上边宽度为最大宽度的50%
    const bottomWidth = width; // 下边宽度为最大宽度
    const points = [
      `0,0`, // 左上角
      `${topWidth},0`, // 右上角
      `${bottomWidth},${height}`, // 右下角
      `0,${height}`, // 左下角
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
    // 左右两个圆点表示最小和最大宽度
    legendGroup
      .append("circle")
      .attr("cx", -10)
      .attr("cy", 25)
      .attr("r", 7)
      .style("fill", this.widthScale(0));

    legendGroup
      .append("circle")
      .attr("cx", widthBarMaxWidth + 10)
      .attr("cy", 25)
      .attr("r", 7)
      .style("fill", this.widthScale(1));
  }

  // 绘制边宽度图例
  private drawEdgeLegend(
    legendGroup: d3.Selection<SVGGElement, unknown, HTMLElement, any>,
    widthBarMaxWidth: number
  ): void {
    // 左右两条竖线表示最小和最大宽度
    legendGroup
      .append("rect")
      .attr("x", -12)
      .attr("y", 15)
      .attr("width", 4)
      .attr("height", 20)
      .style("fill", this.widthScale(0));

    legendGroup
      .append("rect")
      .attr("x", widthBarMaxWidth + 8)
      .attr("y", 15)
      .attr("width", 4)
      .attr("height", 20)
      .style("fill", this.widthScale(1));
  }

  // 创建渐变定义
  public createGradients(): void {
    const gradient = this.svg
      .append("defs")
      .append("linearGradient")
      .attr("id", this.getWidthGradientId())
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "0%")
      .attr("y2", "0%");

    gradient.append("stop").attr("offset", "0%").attr("stop-color", this.widthScale(0));
    gradient.append("stop").attr("offset", "100%").attr("stop-color", this.widthScale(1));
  }
}

export { WidthLegend };

// 设置宽度映射
const nodeWidthScale = d3.scaleLinear().domain([0, 1]).range([5, 40]);
const edgeWidthScale = d3.scaleLinear().domain([0, 1]).range([2, 20]);

// 创建WidthLegend实例
const nodeLegend = new WidthLegend("svg", "node", nodeWidthScale, {
  top: 140,
  right: 20,
  bottom: 20,
  left: 60,
});

// 创建渐变
nodeLegend.createGradients();

// 绘制节点宽度图例
nodeLegend.draw();

// 创建WidthLegend实例
const edgeLegend = new WidthLegend("svg", "edge", edgeWidthScale, {
  top: 200,
  right: 20,
  bottom: 20,
  left: 60,
});

// 创建渐变
edgeLegend.createGradients();

// 绘制边宽度图例
edgeLegend.draw();
