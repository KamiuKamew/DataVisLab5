import { AdjacencyTable, Data } from "./Data";
import PriorityQueue from "priorityqueuejs";
import { Graph } from "./Graph/Basic/Graph";

export type ShortestPathTable = {
  [source_name: string]: {
    [target_name: string]: {
      id: string;
      name: string;
      params: {
        passByNodesId: string[];
        passByEdgeId: string[];
        param: number;
      }[]; // [duration_minute, distance_km, _]
    };
  };
};

// 类型定义：图的结构
export class ShortestPath {
  private adjacencyTable: AdjacencyTable;
  shortestPathTable: ShortestPathTable;

  private inited = false;

  constructor(data: Data) {
    this.adjacencyTable = data.adjacencyTable();
    this.shortestPathTable = {};
  }

  init() {
    const nodes = Object.keys(this.adjacencyTable);
    nodes.forEach((source) => {
      this.shortestPathTable[source] = {};
      nodes.forEach((target) => {
        const name = Graph.getEdgeId(source, target);
        this.shortestPathTable[source][target] = {
          id: name,
          name: name,
          params: [
            { passByNodesId: [], passByEdgeId: [], param: Infinity },
            { passByNodesId: [], passByEdgeId: [], param: Infinity },
            { passByNodesId: [], passByEdgeId: [], param: Infinity },
          ],
        };
      });
    });
    this.inited = true;
  }

  clear() {
    this.shortestPathTable = {};
    this.inited = false;
  }

  // 计算图中所有节点两两之间的最短路径
  public calcAll() {
    if (!this.inited) {
      throw new Error("ShortestPath not inited");
    }
    const nodes = Object.keys(this.adjacencyTable);
    nodes.forEach((source) => {
      this.calcNode(source);
    });
    let total = 0;
    nodes.forEach((source) => {
      nodes.forEach((target) => {
        const path = this.shortestPathTable[source][target];
        total += path.params[0].param !== Infinity ? 1 : 0;
      });
    });
    console.log(`Total paths: ${total}`);
  }

  // 重新计算指定节点到其他所有节点之间的最短路径
  public calcNode(source_name: string) {
    [0, 1, 2].forEach((paramId) => {
      const adj = this.adjacencyTable;
      const nodes = Object.keys(adj);
      const dist: { [key: string]: number } = {};
      const prev: { [key: string]: string | null } = {};
      const passByNodesId: { [key: string]: string[] } = {};
      const passByEdgeId: { [key: string]: string[] } = {};

      // 初始化
      nodes.forEach((node) => {
        dist[node] = Infinity;
        prev[node] = null;
        passByNodesId[node] = [];
        passByEdgeId[node] = [];
      });
      dist[source_name] = 0;

      // 使用 Dijkstra 算法计算最短路径
      const pq = new PriorityQueue<[string, number]>((a, b) => a[1] - b[1]);
      pq.enq([source_name, 0]);
      while (pq.size() > 0) {
        const [u, u_dist] = pq.deq();

        const neighbors = adj[u];
        for (const [v, edge] of Object.entries(neighbors)) {
          const weight = edge.params ? edge.params[paramId] : Infinity;

          // 更新最短路径
          if (u_dist + weight < dist[v]) {
            dist[v] = u_dist + weight;
            prev[v] = u;
            passByNodesId[v] = [...passByNodesId[u], u];
            passByEdgeId[v] = [...passByEdgeId[u], edge.id];

            pq.enq([v, dist[v]]);
          }
        }
      }

      nodes.forEach((target) => {
        if (dist[target] !== Infinity) {
          this.shortestPathTable[source_name][target].params[paramId] = {
            passByNodesId: passByNodesId[target],
            passByEdgeId: passByEdgeId[target],
            param: dist[target],
          };
        }
      });
    });
  }

  // 查询两个指定节点之间的最短路径
  public get(
    src: string,
    dst: string,
    paramId: number
  ): { passByNodesId: string[]; passByEdgeId: string[]; param: number } {
    const path = this.shortestPathTable[src][dst];

    if (!path) {
      return { passByNodesId: [], passByEdgeId: [], param: Infinity };
    }

    return path.params[paramId];
  }
}
