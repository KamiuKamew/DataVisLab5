import { Context } from "../Context";
import { Graph } from "../GraphView/Basic/Graph";

export type Path = {
  id: string;
  name: string;
  params: {
    passByNodesId: string[];
    passByEdgesId: string[];
    param: number;
  };
};

export class Choosed {
  nodeFirst: string | null;
  nodeSecond: string | null;
  edge: string | null;
  path: Path | null;
  constructor(private ctx: Context) {
    this.nodeFirst = null;
    this.nodeSecond = null;
    this.edge = null;
    this.path = null;

    console.log(`[${this.constructor.name}] Constructed.`);
  }
  setNodeFirst(newNode: string | null): string | null {
    let oldNode = null;
    if (this.nodeFirst) oldNode = this.nodeFirst;
    if (oldNode === newNode) newNode = null;
    this.nodeFirst = newNode;
    this.ctx.onChoosedNodeFirstChange(oldNode, newNode);

    this.setPath(
      this.nodeFirst && this.nodeSecond
        ? {
            id: Graph.getEdgeId(this.nodeFirst, this.nodeSecond),
            name: Graph.getEdgeId(this.nodeFirst, this.nodeSecond),
            params: this.ctx.shortestPath.get(this.nodeFirst, this.nodeSecond, 0),
          }
        : null
    );

    return oldNode;
  }

  setNodeSecond(newNode: string | null): string | null {
    let oldNode = null;
    if (this.nodeSecond) oldNode = this.nodeSecond;
    if (oldNode === newNode) newNode = null;
    this.nodeSecond = newNode;
    this.ctx.onChoosedNodeSecondChange(oldNode, newNode);

    this.setPath(
      this.nodeFirst && this.nodeSecond
        ? {
            id: Graph.getEdgeId(this.nodeFirst, this.nodeSecond),
            name: Graph.getEdgeId(this.nodeFirst, this.nodeSecond),
            params: this.ctx.shortestPath.get(this.nodeFirst, this.nodeSecond, 0),
          }
        : null
    );

    return oldNode;
  }

  setEdge(newEdge: string | null): string | null {
    let oldEdge = null;
    if (this.edge) oldEdge = this.edge;
    if (oldEdge === newEdge) newEdge = null;
    this.edge = newEdge;
    this.ctx.onChoosedEdgeChange(oldEdge, newEdge);
    return oldEdge;
  }

  setPath(newPath: Path | null): Path | null {
    let oldPath = null;
    if (this.path) oldPath = this.path;
    if (oldPath?.id === newPath?.id) newPath = null;
    this.path = newPath;
    this.ctx.onChoosedPathChange(oldPath, newPath);
    return oldPath;
  }
}
