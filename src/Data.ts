import * as d3 from "d3";
import { Graph } from "./Graph/Basic/Graph";

export type NodeTable = {
  [id: string]: {
    id: string;
    name: string;

    access_info?: number;
    geo_info?: [number, number]; // 经度，纬度 [longitude, latitude]
  };
};

export type AdjacencyTable = {
  [source_name: string]: {
    [target_name: string]: {
      id: string;
      name: string;

      params?: [number, number, number]; // duration_minute, distance_km, _
    };
  };
};

export class Data {
  private _nodes: NodeTable;
  private _adjacencyTable: AdjacencyTable;

  private loaded: boolean = false;

  constructor() {
    this._nodes = {};
    this._adjacencyTable = {};
  }

  async load(
    AccessInfoURL: string = "./data/FilteredAccessInfo.json",
    GeoInfoURL: string = "./data/FilteredStationGeo.json",
    AdjacencyTableURL: string = "./data/FilteredAdjacencyInfo.json"
  ): Promise<void> {
    await Promise.all([
      d3.json(AccessInfoURL).then((data: any) => {
        Object.entries(data).forEach(([id, access_info]: [string, any]) => {
          if (!this._nodes[id]) {
            this._nodes[id] = { id: id, name: id, access_info: access_info, geo_info: [0, 0] };
            this._adjacencyTable[id] = {};
          }
          this._nodes[id]["access_info"] = access_info;
        });
      }),
      d3.json(GeoInfoURL).then((data_1: any) => {
        Object.entries(data_1).forEach(([id, geo]: [string, any]) => {
          if (!this._nodes[id]) {
            this._nodes[id] = { id: id, name: id, access_info: 0, geo_info: geo };
            this._adjacencyTable[id] = {};
          }
          this._nodes[id]["geo_info"] = geo;
        });
      }),

      d3.json(AdjacencyTableURL).then((data_2: any) => {
        Object.entries(data_2).forEach(([source_name, targets]: [string, any]) => {
          if (this._adjacencyTable[source_name]) {
            Object.entries(targets).forEach(
              ([target_name, [duration_minute, distance_km, _]]: [string, any]) => {
                if (
                  source_name !== target_name &&
                  this._adjacencyTable[target_name][source_name] === undefined
                ) {
                  const name = Graph.getEdgeId(source_name, target_name);
                  this._adjacencyTable[source_name][target_name] = {
                    id: name,
                    name: name,

                    params: [duration_minute, distance_km, _],
                  };
                }
              }
            );
          }
        });
      }),
    ]);
    console.log(this._nodes);
    console.log(this._adjacencyTable);
    this.loaded = true;
  }

  nodes(): NodeTable {
    if (!this.loaded) {
      throw new Error("Data not loaded yet.");
    }
    return this._nodes;
  }

  adjacencyTable(): AdjacencyTable {
    if (!this.loaded) {
      throw new Error("Data not loaded yet.");
    }
    return this._adjacencyTable;
  }
}
