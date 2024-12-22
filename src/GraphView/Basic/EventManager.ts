export type GraphEvent = "NodeAdded" | "NodeRemoved" | "EdgeAdded" | "EdgeRemoved";
export const GraphEvents: Set<GraphEvent> = new Set([
  "NodeAdded",
  "NodeRemoved",
  "EdgeAdded",
  "EdgeRemoved",
]);
export type GraphEventCallback = (id: string, metaData?: Record<string, any>) => void;

export class GraphEventManager {
  private _callbacks: Map<GraphEvent, GraphEventCallback[]> = new Map();

  constructor() {
    this._callbacks = new Map();
    GraphEvents.forEach((event) => {
      this._callbacks.set(event, []);
    });
  }

  on(event: GraphEvent, callback: GraphEventCallback): void {
    (
      this._callbacks.get(event) ??
      (() => {
        throw new Error(`Event ${event} does not exist`);
      }).call(null)
    ).push(callback);
  }

  off(event: GraphEvent, callback: GraphEventCallback): void {
    const callbacks = this._callbacks.get(event) ?? [];
    this._callbacks.set(
      event,
      callbacks.filter((callback) => callback !== callback)
    );
  }

  trigger(event: GraphEvent, context: { id: string; metaData?: Record<string, any> }): void {
    const { id, metaData } = context;
    this._callbacks.get(event)?.forEach((callback) => callback(id, metaData));
  }

  clear(): void {
    this._callbacks.forEach((callbacks) => {
      callbacks.length = 0;
    });
  }
}
