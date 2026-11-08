/* Shared @dnd-kit settings for views whose draggable is also a button (calendar chips, timeline bars): Space picks up and drops,
   Enter still clicks, and the click a drop leaves behind is ignored. */
import { KeyboardCode, type ClientRect, type KeyboardCoordinateGetter, type KeyboardSensorOptions } from '@dnd-kit/core';

let endedAt = 0;
export const markDragEnd = () => {
  endedAt = performance.now();
};
/** True right after a drop, when the browser still delivers the click of the mouseup or Space keyup that ended it. */
export const justDragged = () => performance.now() - endedAt < 300;

/** Arrow keys move the dragged item by one step (a day cell, a timeline day). `over` is the rect of the drop target under it. */
export function stepKeys(step: (code: string, over: ClientRect | undefined) => { dx: number; dy: number } | null): KeyboardSensorOptions {
  const coordinateGetter: KeyboardCoordinateGetter = (e, { currentCoordinates: c, context }) => {
    const s = step(e.code, context.over ? context.droppableRects.get(context.over.id) : undefined);
    if (!s) return undefined;
    e.preventDefault();
    return { x: c.x + s.dx, y: c.y + s.dy };
  };
  return {
    coordinateGetter,
    keyboardCodes: { start: [KeyboardCode.Space], cancel: [KeyboardCode.Esc], end: [KeyboardCode.Space] },
  };
}
