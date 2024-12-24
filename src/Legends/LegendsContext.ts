import * as d3 from "d3";
import { ColorLegend } from "./ColorLegend";
import { WidthLegend } from "./WidthLegend";
import { Context } from "../Context";

type LegendOptions = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export class LegendContext {
  private svgSelector: string;

  constructor(private ctx: Context, svgSelector: string) {
    this.svgSelector = svgSelector;
  }

  public render(): void {
    // 设置颜色映射
    const nodeColorScale = d3
      .scaleLinear()
      .domain([10000, 25000])
      .range(["steelblue", "tomato"] as any);
    const edgeColorScale = d3
      .scaleLinear()
      .domain([10000, 160000])
      .range(["steelblue", "tomato"] as any);

    // 绘制节点颜色图例
    this.createColorLegend(
      "node",
      nodeColorScale,
      {
        top: 20,
        right: 20,
        bottom: 20,
        left: 60,
      },
      "节点颜色：年均到达人数（单位：万人）"
    );

    // 绘制边颜色图例
    this.createColorLegend(
      "edge",
      edgeColorScale,
      {
        top: 80,
        right: 20,
        bottom: 20,
        left: 60,
      },
      "边颜色：年均客流量（单位：万人）"
    );

    // 设置宽度映射
    const nodeWidthScale = d3.scaleLinear().domain([0, 15]).range([5, 15]);
    const edgeWidthScale = d3.scaleLinear().domain([0, 30]).range([1.5, 10.5]);

    // 绘制节点宽度图例
    this.createWidthLegend(
      "node",
      nodeWidthScale,
      {
        top: 140,
        right: 20,
        bottom: 20,
        left: 60,
      },
      "节点宽度：节点的度"
    );

    // 绘制边宽度图例
    this.createWidthLegend(
      "edge",
      edgeWidthScale,
      {
        top: 200,
        right: 20,
        bottom: 20,
        left: 60,
      },
      "边宽度：边的度（两端节点的度之和）"
    );
  }

  private createColorLegend(
    type: string,
    scale: d3.ScaleLinear<number, number>,
    options: LegendOptions,
    text: string
  ): void {
    const legend = new ColorLegend(this, this.svgSelector, type, scale, options, text);
    legend.createGradients();
    legend.draw();
  }

  private createWidthLegend(
    type: string,
    scale: d3.ScaleLinear<number, number>,
    options: LegendOptions,
    text: string
  ): void {
    const legend = new WidthLegend(this, this.svgSelector, type, scale, options, text);
    legend.createGradients();
    legend.draw();
  }

  filter = (
    filterKind: "node-color" | "edge-color" | "node-width" | "edge-width",
    range: [number, number]
  ) => this.ctx.filter(filterKind, range);
}
