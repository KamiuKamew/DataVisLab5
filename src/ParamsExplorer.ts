import { Context } from "./Context";
import { Data, NodeTable } from "./Data";
import { Names } from "./Names";
import { Graph } from "./Graph/Basic/Graph";

export class ParamsExplorer {
  private sidePanelContent: HTMLElement;

  constructor(private ctx: Context, private data: Data) {
    this.sidePanelContent = document.getElementById(
      Names.LeftPanel_SidePanelContent
    ) as HTMLElement;
  }

  explore(dataCategory: string, id?: string) {
    if (typeof id !== "string") {
      console.warn("[ParamsExplorer] id: ", id);
      throw new Error("[ParamsExplorer] Invalid id");
    }

    let targetParams: {
      [key: string]: any;
    };
    if (dataCategory === Names.DataCategory_Station && id) targetParams = this.data.nodes()[id];
    else if (dataCategory === Names.DataCategory_Track && id) {
      const sourceId = Graph.getSourceId(id);
      const targetId = Graph.getTargetId(id);
      targetParams =
        this.data.adjacencyTable()[sourceId][targetId] ??
        this.data.adjacencyTable()[targetId][sourceId];
    } else {
      throw new Error("[ParamsExplorer] Invalid dataCategory or id");
    }

    console.log("[ParamsExplorer] explore", id, targetParams);

    // 创建一个表单元素来展示参数
    const parameterForm = document.createElement("form");
    parameterForm.style.display = "block";

    // 递归处理参数对象并生成表单
    this.createFormFields(id, targetParams, parameterForm);

    // 清空侧边栏并将表单添加到侧边栏内容中
    this.sidePanelContent.innerHTML = ""; // 清空当前内容（如果需要重新渲染）
    this.sidePanelContent.appendChild(parameterForm);
  }

  createFormFields(
    id: string,
    nodeParams: { [key: string]: any },
    container: HTMLElement,
    parentKey: string = ""
  ) {
    Object.entries(nodeParams).forEach(([key, value]) => {
      console.log(nodeParams, key, value);
      const fullKey = parentKey ? `${parentKey}.${key}` : key; // 处理嵌套字段的 key（用于唯一标识）

      let label = document.createElement("label");
      label.textContent = fullKey; // 显示字段名
      label.style.display = "block";

      let input: HTMLElement;

      // 判断值的类型并创建相应的输入控件
      if (typeof value === "object" && !Array.isArray(value)) {
        // 如果是对象，递归生成其内部字段
        input = document.createElement("div");
        input.style.marginLeft = "20px"; // 给嵌套的字典加一些左边距
        this.createFormFields(id, value, input, fullKey); // 递归调用
      } else if (Array.isArray(value)) {
        // 如果是数组，直接修改原数组的元素
        input = document.createElement("div");

        const arrayKey = fullKey;
        this.createFormFields(id, value, input, arrayKey); // 递归调用，直接传递原数组引用
      } else {
        // 处理基础数据类型 (number 或 string)
        input = document.createElement("input");
        (input as HTMLInputElement).type = typeof value; // 设置 input 类型（number 或 text）
        (input as HTMLInputElement).value = String(value ?? ""); // 设置默认值

        // 监听值变化并更新数据
        input.addEventListener("change", (e) => {
          if (e.target) {
            const newValue = (e.target as HTMLInputElement).value;

            // 更新数据
            if (typeof value === "number") {
              nodeParams[key] = isNaN(Number(newValue)) ? value : Number(newValue);
            } else {
              nodeParams[key] = newValue;
            }

            // 更新视图
            this.ctx.onParamChange(id);
          }
        });
      }

      // 将标签和输入框加入到容器中
      const formRow = document.createElement("div");
      formRow.style.display = "flex";
      formRow.style.marginBottom = "10px";

      const labelContainer = document.createElement("div");
      labelContainer.style.flex = "1";
      labelContainer.appendChild(label);

      const inputContainer = document.createElement("div");
      inputContainer.style.flex = "2";
      inputContainer.appendChild(input);

      formRow.appendChild(labelContainer);
      formRow.appendChild(inputContainer);
      container.appendChild(formRow);
    });
  }
}
