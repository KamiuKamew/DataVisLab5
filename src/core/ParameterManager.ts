import { NodeBasicParamRegistry, EdgeBasicParamRegistry } from "./Graph";
import { NodePhysicParamRegistry } from "../logic/Force/Simulator";
import { GraphEventManager } from "./Graph/EventManager";
import { GUIController } from "../gui/controller";

/**
 * 描述单个节点参数的结构。
 */
export interface Parameter {
  name: string; // 参数名称
  type: "boolean" | "number" | "string" | "select"; // 参数类型
  value: any; // 当前值
  options?: any[]; // 可选值（针对下拉框类型）
  isChanganble: boolean; // 是否可修改
  onChange: (nodeId: string, newValue: any) => void; // 当参数值变化时的回调函数。
  // 这些回调函数会在参数值**因手动更改而**发生变化时被调用（见parameter_explorer.ts中的param.onChange）。
  // 注意：**因自动变化而**产生的变化不会触发回调函数，例如物理模拟导致x变化时，不会触发回调函数。
}

/**
 * 节点参数管理类。
 * 允许模块为节点动态注册可调节的参数。
 *
 * 在这里的参数都是会被显示到节点面板上的参数。
 */
export class ParameterManager {
  private initialNodeParameters: Parameter[]; // 初始参数列表。在节点创建时，会将初始参数列表复制到节点参数列表中。
  private initialEdgeParameters: Parameter[]; // 初始边参数列表。在边创建时，会将初始参数列表复制到边参数列表中。
  private Parameters: Map<string, Parameter[]>; // 节点/边 ID -> 参数列表

  constructor(private controller: GUIController) {
    this.initialNodeParameters = [];
    this.initialEdgeParameters = [];
    this.Parameters = new Map();
  }

  registerCallbacks(graphEventManager: GraphEventManager) {
    graphEventManager.on("NodeAdded", (nodeId) => {
      // this.nodeParameters.set(nodeId, this.initialParameters.slice()); 这是浅拷贝，不对。
      // this.Parameters.set(nodeId, JSON.parse(JSON.stringify(this.initialNodeParameters))); // 这里用深拷贝 // 但是也不对。
      const newParameters = this.initialNodeParameters.map((param) => ({
        ...param, // 浅拷贝所有属性
        options: param.options ? [...param.options] : undefined, // 确保深拷贝数组
      }));
      this.Parameters.set(nodeId, newParameters);

      console.log(
        `[ParameterManager] Node added: ${nodeId} with parameters: `,
        this.Parameters.get(nodeId)
      );
    });
    graphEventManager.on("NodeRemoved", (nodeId) => {
      this.Parameters.delete(nodeId);
    });
    graphEventManager.on("EdgeAdded", (edgeId) => {
      this.Parameters.set(edgeId, JSON.parse(JSON.stringify(this.initialEdgeParameters)));
      console.log(
        `[ParameterManager] Edge added: ${edgeId} with parameters: `,
        this.Parameters.get(edgeId)
      );
    });
    graphEventManager.on("EdgeRemoved", (edgeId) => {
      this.Parameters.delete(edgeId);
    });
  }

  /**
   * 添加一个初始参数。
   * @param parameter - 参数信息。
   */
  addNodeParam(parameter: Parameter): void {
    this.initialNodeParameters.push(parameter);
  }

  addEdgeParam(parameter: Parameter): void {
    this.initialEdgeParameters.push(parameter);
  }

  existNodeParam(parameterName: string): boolean {
    return this.initialNodeParameters.some((p) => p.name === parameterName);
  }

  existEdgeParam(parameterName: string): boolean {
    return this.initialEdgeParameters.some((p) => p.name === parameterName);
  }

  // 仅被模拟器调用。
  get(Id: string, parameterName: string): any {
    const parameters = this.Parameters.get(Id) || [];
    if (parameters === undefined) throw new Error(`[ParameterManager] Item ${Id} unfound.`);
    const parameter = parameters.find((p) => p.name === parameterName);
    if (parameter === undefined)
      throw new Error(`[ParameterManager] Parameter ${parameterName} unfound in Item ${Id}.`);
    return parameter?.value;
  }

  // 仅被模拟器调用。
  // 参数设置面板内的值变化时，不会调用此函数，而是会直接param.value = newValue;。
  // 因此**此处不可以调用onChange回调函数**，
  // 因为onChange是用来向模拟器通知参数改变用的，然而这个消息本身是由模拟器发出的，所以不需要通知。
  // 反而需要向参数面板通知参数值变化。
  set(Id: string, parameterName: string, value: any): void {
    const parameters = this.Parameters.get(Id);
    if (parameters === undefined) throw new Error(`[ParameterManager] Item ${Id} unfound.`);
    const parameter = parameters.find((p) => p.name === parameterName);
    if (parameter === undefined)
      throw new Error(`[ParameterManager] Parameter ${parameterName} unfound in Item ${Id}.`);
    parameter.value = value;
    this.controller.panelEvent().trigger("UpdateParameter", { paramName: parameterName, id: Id });
  }

  getChangeable(Id: string, parameterName: string): boolean {
    const parameters = this.Parameters.get(Id);
    if (parameters === undefined) throw new Error(`[ParameterManager] Item ${Id} unfound.`);
    const parameter = parameters.find((p) => p.name === parameterName);
    if (parameter === undefined)
      throw new Error(`[ParameterManager] Parameter ${parameterName} unfound in Item ${Id}.`);
    return parameter.isChanganble;
  }

  setChangeable(Id: string, parameterName: string, isChanganble: boolean): void {
    const parameters = this.Parameters.get(Id);
    if (parameters === undefined) throw new Error(`[ParameterManager] Item ${Id} unfound.`);
    const parameter = parameters.find((p) => p.name === parameterName);
    if (parameter === undefined)
      throw new Error(`[ParameterManager] Parameter ${parameterName} unfound in Item ${Id}.`);
    parameter.isChanganble = isChanganble;
    this.controller.panelEvent().trigger("UpdateParameter", { paramName: parameterName, id: Id });
  }

  /**
   * 为指定节点/边注册一个新参数。
   * @param itemId - 节点/边 ID。
   * @param parameter - 参数信息。
   */
  registerToTarget(itemId: string, parameter: Parameter): void {
    if (!this.Parameters.has(itemId)) {
      this.Parameters.set(itemId, []);
    }
    this.Parameters.get(itemId)!.push(parameter);
  }

  /**
   * 获取指定节点/边的所有参数。
   * @param itemId - 节点 ID。
   * @returns {Parameter[]} 参数列表。
   */
  getParametersFromTarget(itemId: string): Parameter[] {
    return this.Parameters.get(itemId) || [];
  }
}

export class NodeParameterRegistry {
  private parameterManager: ParameterManager;

  private nodeBasicParamRegistry: NodeBasicParamRegistry; // 节点基础参数注册器
  private nodePhysicParamRegistry: NodePhysicParamRegistry; // 节点物理参数注册器
  // TODO

  constructor(parameterManager: ParameterManager) {
    this.parameterManager = parameterManager;

    this.nodeBasicParamRegistry = new NodeBasicParamRegistry(parameterManager);
    this.nodePhysicParamRegistry = new NodePhysicParamRegistry(parameterManager);
    // TODO
  }

  registerAll() {
    this.nodeBasicParamRegistry.register("info");
    this.nodePhysicParamRegistry.register("x", "y", "vx", "vy", "radius");
    // TODO

    console.log("NodeParameterRegistry: All parameters registered.", this.parameterManager);
  }
}

export class EdgeParameterRegistry {
  private parameterManager: ParameterManager;

  private edgeBasicParamRegistry: EdgeBasicParamRegistry; // 边基础参数注册器
  // TODO

  constructor(parameterManager: ParameterManager) {
    this.parameterManager = parameterManager;

    this.edgeBasicParamRegistry = new EdgeBasicParamRegistry(parameterManager);
    // TODO
  }

  registerAll() {
    this.edgeBasicParamRegistry.register("info");
    // TODO

    console.log("EdgeParameterRegistry: All parameters registered.", this.parameterManager);
  }
}
