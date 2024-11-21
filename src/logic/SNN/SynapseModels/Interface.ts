/**
 * 突触模型基类，定义突触的基本接口。
 */
export abstract class SynapseModel {
  /**
   * 更新突触权重。
   * @param deltaTime - 时间步长。
   */
  abstract update(deltaTime: number, synapseId: string): void;

  /**
   * 获取当前突触权重。
   * @returns {number} - 当前突触权重。
   */
  abstract getWeight(synapseId: string): number;
}
