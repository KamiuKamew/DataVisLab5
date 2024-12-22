export type CanvasEvent = "NodeClicked" | "EdgeClicked" | "CanvasClicked" | "NodeDragEnd";
export const CanvasEvents: Set<CanvasEvent> = new Set([
  "NodeClicked",
  "EdgeClicked",
  "CanvasClicked",
  "NodeDragEnd",
]);
export type CanvasEventCallback = (
  event: MouseEvent,
  itemId?: string,
  metaData?: Record<string, any>
) => void;

export class CanvasEventManager {
  private _callbacks: Map<CanvasEvent, CanvasEventCallback[]>;

  constructor(private canvas: SVGSVGElement) {
    this._callbacks = new Map();
    CanvasEvents.forEach((event) => {
      this._callbacks.set(event, []);
    });
  }

  on(event: CanvasEvent, callback: CanvasEventCallback): void {
    (
      this._callbacks.get(event) ??
      (() => {
        throw new Error(`Event ${event} is not supported`);
      }).call(null)
    ).push(callback);
  }

  off(event: CanvasEvent, callback: CanvasEventCallback): void {
    const callbacks = this._callbacks.get(event) ?? [];
    this._callbacks.set(
      event,
      callbacks.filter((c) => c !== callback)
    );
  }

  trigger(
    canvasMouseEvent: CanvasEvent,
    context: { event: MouseEvent; id?: string; metaData?: Record<string, any> }
  ): void {
    const { event, id, metaData } = context;
    this._callbacks.get(canvasMouseEvent)?.forEach((callback) => callback(event, id, metaData));
  }

  clear(): void {
    this._callbacks.forEach((callbacks) => {
      callbacks.length = 0;
    });
  }
}
