import * as d3 from "d3";
import { Graph } from "../GraphView/Basic/Graph";

export type NodeTable = {
  [id: string]: {
    id: string;
    name: string;

    access_info: number;
    geo_info: [number, number]; // 经度，纬度 [longitude, latitude]
    degree: number;
  };
};

export type AdjacencyTable = {
  [source_name: string]: {
    [target_name: string]: {
      id: string;
      name: string;

      trainShifts: number; // 车次数量
      params: [number, number, number]; // duration_minute, distance_km, _
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

    console.log(`[${this.constructor.name}] Constructed.`);
  }

  async load(
    AccessInfoURL: string = "./data/FilteredAccessInfo.json",
    GeoInfoURL: string = "./data/FilteredStationGeo.json",
    AdjacencyTableURL: string = "./data/FilteredAdjacencyInfo.json",
    TrainInfoURL: string = "./data/FilteredTrainInfo.json"
  ): Promise<void> {
    await d3.json(AccessInfoURL).then((data: any) => {
      Object.entries(data).forEach(([id, access_info]: [string, any]) => {
        if (!this._nodes[id]) {
          this._nodes[id] = {
            id: id,
            name: id,
            access_info: access_info,
            geo_info: [0, 0],
            degree: 0,
          };
          this._adjacencyTable[id] = {};
        }
        this._nodes[id]["access_info"] = access_info;
      });
      console.log(`[${this.constructor.name}] AccessInfo loaded.`);
    });
    await d3.json(GeoInfoURL).then((data_1: any) => {
      Object.entries(data_1).forEach(([id, geo]: [string, any]) => {
        if (!this._nodes[id]) {
          this._nodes[id] = { id: id, name: id, access_info: 0, geo_info: geo, degree: 0 };
          this._adjacencyTable[id] = {};
        }
        this._nodes[id]["geo_info"] = geo;
      });
      console.log(`[${this.constructor.name}] GeoInfo loaded.`);
    });
    await d3.json(AdjacencyTableURL).then((data_2: any) => {
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

                  trainShifts: 0,
                  params: [duration_minute, distance_km, _],
                };
                this._nodes[source_name].degree++;
                this._nodes[target_name].degree++;
              }
            }
          );
        }
      });
      console.log(`[${this.constructor.name}] AdjacencyTable loaded.`);
    });
    await d3.json(TrainInfoURL).then((data_2: any) => {
      Object.entries(data_2).forEach(([source_name, targets]: [string, any]) => {
        if (this._adjacencyTable[source_name]) {
          Object.entries(targets).forEach(([target_name, trainShifts]: [string, any]) => {
            if (
              source_name !== target_name &&
              this._adjacencyTable[target_name][source_name] === undefined
            ) {
              const name = Graph.getEdgeId(source_name, target_name);
              this._adjacencyTable[source_name][target_name] = {
                id: name,
                name: name,

                trainShifts:
                  (d3.min([trainShifts, 5]) + 1) *
                  d3.min([
                    (this._nodes[source_name].access_info + this._nodes[target_name].access_info) /
                      2,
                    31921.15,
                  ])!,
                params: [0, 0, 0],
              };
            }
          });
        }
      });
      console.log(`[${this.constructor.name}] TrainInfo loaded.`);
    });
    this.loaded = true;

    console.log(`[${this.constructor.name}] loaded.`);
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
