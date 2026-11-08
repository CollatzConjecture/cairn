import { beforeEach, describe, expect, it, vi } from 'vitest';
import { seed } from '../domain/seed';

/** A localStorage stand-in seeded with `raw` under the storage key. */
function storage(raw: string | null) {
  const m = new Map<string, string>(raw == null ? [] : [['gr8r.v2', raw]]);
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    m,
  };
}
async function boot(raw: string | null) {
  const ls = storage(raw);
  vi.stubGlobal('localStorage', ls);
  vi.resetModules();
  const mod = await import('./store');
  return { ...mod, ls };
}

/** A save from the original JavaScript app: its seed after a session, with the quirks older saves carry. */
function oldSave() {
  const data: Record<string, unknown> & { tasks: Record<string, unknown>[]; members: Record<string, unknown>[]; comments: Record<string, unknown>[] } =
    JSON.parse(JSON.stringify(seed()));
  delete data.teams;
  data.tasks[0] = { ...data.tasks[0], title: 'Renamed by the user', est: '2d', len: 5, age: 28 };
  data.members[2] = { ...data.members[2], team: '' };
  delete data.comments[0]?.re;
  return JSON.stringify({
    data,
    prefs: { theme: 'dark', accent: 'teal', weekStart: '0', home: 'not-a-page' },
    views: {
      'p:p1': {
        filters: [{ f: 'priority', op: 'is', v: ['high'] }],
        sort: { f: 'due', dir: -1 },
        group: 'assignee',
        q: '',
        hidden: [],
        colW: {},
        showDone: true,
      },
      junk: 42,
    },
    collapsed: true,
  });
}

describe('persisted state', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('loads a gr8r.v2 save from the original JavaScript app with the user’s data', async () => {
    const { useStore } = await boot(oldSave());
    const s = useStore.getState();
    expect(s.data.tasks[0]?.title).toBe('Renamed by the user');
    expect(s.data.members[2]?.team).toBeNull();
    expect(s.data.teams.map(t => t.id)).toEqual(['design', 'eng', 'mkt', 'product']);
    expect(s.data.comments[0]?.re).toEqual({});
    expect(s.prefs).toMatchObject({ theme: 'dark', accent: 'teal', weekStart: 0, home: 'home', density: 'comfortable' });
    expect(s.views['p:p1']?.group).toBe('assignee');
    expect(Object.keys(s.views)).toEqual(['p:p1']);
    expect(s.ui.collapsed).toBe(true);
  });

  it.each([
    ['corrupt JSON', '{"data": '],
    ['data that fails the schema', JSON.stringify({ data: { ...seed(), tasks: [{ id: 't1', status: 'someday' }] } })],
    ['a blob without data', JSON.stringify({ prefs: { theme: 'dark' } })],
  ])('falls back to the seed on %s', async (_, raw) => {
    const { useStore, DEFAULT_PREFS } = await boot(raw);
    const s = useStore.getState();
    expect(s.data.tasks.map(t => t.title)).toEqual(seed().tasks.map(t => t.title));
    expect(s.prefs).toEqual(DEFAULT_PREFS);
    expect(s.ui.collapsed).toBe(false);
  });

  it('writes back the gr8r.v2 shape, skipping UI-only changes', async () => {
    const { useStore, set, ls } = await boot(null);
    set(s => {
      s.ui.collapsed = true;
    });
    const saved = JSON.parse(ls.m.get('gr8r.v2') ?? '{}');
    expect(Object.keys(saved).sort()).toEqual(['collapsed', 'data', 'prefs', 'views']);
    expect(saved.collapsed).toBe(true);
    ls.m.delete('gr8r.v2');
    set(s => {
      s.ui.mnav = true;
    });
    expect(ls.m.has('gr8r.v2')).toBe(false);
    expect(useStore.getState().ui.mnav).toBe(true);
  });
});
