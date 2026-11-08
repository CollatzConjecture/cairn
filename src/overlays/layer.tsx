import { DrawerLayer } from './drawer';
import { useGlobalShortcuts } from './keyboard';
import { ModalsLayer } from './modals';
import { PaletteLayer } from './palette';

/** The centrally hosted overlays: anything a shortcut or the palette opens from anywhere (`ui.drawer`, `ui.modals`, `ui.palette`).
    Each renders a shadcn Sheet or Dialog, which portals itself. Popovers and menus are not here: they live next to their triggers. */
export function Layer() {
  useGlobalShortcuts();
  return (
    <>
      <DrawerLayer />
      <ModalsLayer />
      <PaletteLayer />
    </>
  );
}
