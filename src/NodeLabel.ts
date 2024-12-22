import * as d3 from "d3";

export class NodeLabel {
  private offsetX: number;
  private offsetY: number;
  private labels: { x: number; y: number; width: number; height: number }[]; // 存储所有标签的位置

  constructor(offsetX: number = 10, offsetY: number = 0) {
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.labels = [];
  }

  /**
   * 计算标签的候选区域
   * @param nodeX 节点的X坐标
   * @param nodeY 节点的Y坐标
   * @param labelWidth 标签宽度
   * @param labelHeight 标签高度
   * @returns 可能的候选区域
   */
  private getLabelCandidates(
    nodeX: number,
    nodeY: number,
    labelWidth: number,
    labelHeight: number
  ) {
    return [
      { x: nodeX + this.offsetX, y: nodeY + this.offsetY, priority: 1 }, // 右侧
      { x: nodeX + this.offsetX, y: nodeY - labelHeight - 5, priority: 2 }, // 上方
      { x: nodeX + this.offsetX, y: nodeY + labelHeight + 5, priority: 3 }, // 下方
      { x: nodeX - labelWidth - 5, y: nodeY + this.offsetY, priority: 4 }, // 左侧
    ];
  }

  /**
   * 检测新标签是否与已有标签重叠
   */
  private isOverlapping(newLabel: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): boolean {
    return this.labels.some(
      (label) =>
        Math.abs(newLabel.x - label.x) < (newLabel.width + label.width) / 2 &&
        Math.abs(newLabel.y - label.y) < (newLabel.height + label.height) / 2
    );
  }

  /**
   * 计算并调整标签位置，优先考虑候选区域
   */
  private adjustLabelPosition(
    nodeX: number,
    nodeY: number,
    labelWidth: number,
    labelHeight: number
  ): { x: number; y: number } {
    const candidates = this.getLabelCandidates(nodeX, nodeY, labelWidth, labelHeight);

    for (const candidate of candidates) {
      let position = { x: candidate.x, y: candidate.y };

      // 检查该位置是否有重叠
      if (
        !this.isOverlapping({
          x: position.x,
          y: position.y,
          width: labelWidth,
          height: labelHeight,
        })
      ) {
        return position;
      }
    }

    // 如果所有候选位置都重叠，继续调整
    return { x: nodeX + this.offsetX, y: nodeY + this.offsetY }; // 默认值
  }

  /**
   * 在节点上追加标签
   */
  appendLabel(selection: d3.Selection<any, any, any, any>) {
    selection.each((d: any, i: number, nodes: any) => {
      const node = d3.select(nodes[i]);
      const parentGroup = node.node().parentNode as SVGElement;
      const g = d3.select(parentGroup);

      // 计算初始位置
      const initialX = +node.attr("cx") + this.offsetX;
      const initialY = +node.attr("cy") + this.offsetY;

      // 获取标签文本的大小，确保标签的宽度和高度不会过大
      const labelText = d.label || "Label";
      const textElement = g.append("text").text(labelText).style("font-size", "12px");

      const bbox = textElement.node().getBBox(); // 获取文本的边界框
      const newLabel = { x: initialX, y: initialY, width: bbox.width, height: bbox.height };

      // 删除临时文本节点
      textElement.remove();

      // 调整位置以避免重叠
      const position = this.adjustLabelPosition(initialX, initialY, bbox.width, bbox.height);

      // 添加标签
      const label = g
        .append("text")
        .attr("class", "node-label")
        .attr("x", position.x)
        .attr("y", position.y)
        .text(labelText)
        .style("font-size", "12px")
        .style("pointer-events", "none");

      // 更新标签位置
      this.labels.push({ x: position.x, y: position.y, width: bbox.width, height: bbox.height });

      // 如果节点支持拖动，确保标签同步移动
      if (node.call) {
        node.call(
          d3.drag<any, any>().on("drag", (event, d) => {
            const newX = event.x + this.offsetX;
            const newY = event.y + this.offsetY;

            label.attr("x", newX).attr("y", newY);

            // 更新标签存储的位置
            const labelIndex = this.labels.findIndex(
              (l) => l.x === newLabel.x && l.y === newLabel.y
            );
            if (labelIndex !== -1) {
              this.labels[labelIndex] = {
                x: newX,
                y: newY,
                width: bbox.width,
                height: bbox.height,
              };
            }
          })
        );
      }
    });
  }
}
