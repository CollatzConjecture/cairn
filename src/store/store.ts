import type { Draft } from 'immer';
import { z } from 'zod';
import { create } from 'zustand';
import { persist, type PersistStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { DataSchema, PrefsSchema, ViewSchema, type Data, type Prefs, type View } from '../domain/schema';
import { seed } from '../domain/seed';
import { toast } from '../ui/toast';
import { viewOf } from './selectors';
import { initialUi, type Ui, type ViewKey } from './ui';

export type Views = Partial<Record<ViewKey, View>>;
export type State = { data: Data; prefs: Prefs; views: Views; ui: Ui };

// The key keeps its pre-Cairn name so saves from earlier versions still load.
export const STORE_KEY = 'gr8r.v2';
/** Every preference schema field falls back to its default, so parsing nothing yields the defaults. */
export const DEFAULT_PREFS: Prefs = PrefsSchema.parse({});

/** The `gr8r.v2` on-disk shape `{data, prefs, views, collapsed}`. Only `data` must be valid; the rest falls back field by field. */
const PersistedSchema = z.object({
  data: DataSchema,
  prefs: PrefsSchema.catch(() => DEFAULT_PREFS),
  views: z
    .record(z.string(), z.unknown())
    .catch({})
    .transform(vs => {
      const out: Views = {};
      for (const [k, v] of Object.entries(vs)) {
        const r = ViewSchema.safeParse(v);
        if (r.success) out[k as ViewKey] = r.data;
      }
      return out;
    }),
  collapsed: z.boolean().catch(false),
});
type Persisted = { data: Data; prefs: Prefs; views: Views; collapsed: boolean };

let lastWritten: Persisted | null = null;
const storage: PersistStorage<Persisted> = {
  getItem: name => {
    try {
      const raw = localStorage.getItem(name);
      return raw ? { state: JSON.parse(raw), version: 0 } : null;
    } catch {
      return null; // storage blocked or corrupt: start from the seed
    }
  },
  setItem: (name, { state }) => {
    const l = lastWritten;
    // Only data, prefs, views, and the sidebar persist; skip the write when a UI-only change produced the same objects.
    if (l && l.data === state.data && l.prefs === state.prefs && l.views === state.views && l.collapsed === state.collapsed) return;
    lastWritten = state;
    try {
      localStorage.setItem(name, JSON.stringify(state));
    } catch {
      // storage full or blocked: keep working in memory
    }
  },
  removeItem: name => localStorage.removeItem(name),
};

export const useStore = create<State>()(
  persist(
    immer(() => ({ data: seed(), prefs: DEFAULT_PREFS, views: {}, ui: initialUi() })),
    {
      name: STORE_KEY,
      storage,
      partialize: s => ({ data: s.data, prefs: s.prefs, views: s.views, collapsed: s.ui.collapsed }),
      merge: (persisted, current) => {
        const r = PersistedSchema.safeParse(persisted);
        if (!r.success) return current;
        const { data, prefs, views, collapsed } = r.data;
        return { ...current, data, prefs, views, ui: { ...current.ui, collapsed } };
      },
    },
  ),
);

export const get = useStore.getState;
export const set = (fn: (s: Draft<State>) => void) => useStore.setState(fn);

/** A data change that fails with a retry toast while the app simulates being offline. */
export function mutate(fn: (s: Draft<State>) => void): boolean {
  if (get().ui.offline) {
    toast("Your changes couldn't be saved. You're offline.", { kind: 'err', action: 'Try again', onAction: () => mutate(fn) });
    return false;
  }
  set(fn);
  return true;
}

/** Long enough for the longest one-shot animation (1.4s), so clearing a flag never cuts one short. */
const FX_MS = 1600;
let fxTimer: ReturnType<typeof setTimeout> | undefined;
useStore.subscribe((s, prev) => {
  if (s.ui.fx === prev.ui.fx || !Object.keys(s.ui.fx).length) return;
  clearTimeout(fxTimer);
  fxTimer = setTimeout(
    () =>
      set(d => {
        d.ui.fx = {};
      }),
    FX_MS,
  );
});

/** A view's settings. Use this, not `useStore(s => viewOf(...))`: a selector must return stored objects, never fresh ones. */
export function useView(key: ViewKey): View {
  const stored = useStore(s => s.views[key]);
  const data = useStore(s => s.data);
  return stored ?? viewOf({}, data, key);
}
