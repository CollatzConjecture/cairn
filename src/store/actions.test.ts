import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addD, iso, parse } from '../domain/date';
import { taskId } from '../domain/ids';

async function boot() {
  const m = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: () => {} });
  vi.resetModules();
  return import('./index');
}

describe('task actions', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('completing a recurring task schedules its next occurrence and logs both', async () => {
    const { get, toggleDone, taskById } = await boot();
    const id = taskId('t15');
    const before = taskById(get().data, id);
    expect(before?.recur).toBe('Weekly');
    toggleDone(id);
    const d = get().data;
    expect(taskById(d, id)?.status).toBe('done');
    const next = d.tasks.at(-1);
    expect(next).toMatchObject({ title: before?.title, status: 'todo', recur: 'Weekly', due: iso(addD(parse(before?.due ?? ''), 7)) });
    expect(next?.key).toBe('WEB-201');
    expect(d.activity.slice(0, 2).map(a => a.verb)).toEqual(['created', 'completed']);
  });

  it('refuses data changes while offline', async () => {
    const { get, set, toggleDone, taskById } = await boot();
    set(s => {
      s.ui.offline = true;
    });
    toggleDone(taskId('t1'));
    expect(taskById(get().data, taskId('t1'))?.status).toBe('done');
    toggleDone(taskId('t6'));
    expect(taskById(get().data, taskId('t6'))?.status).toBe('todo');
  });

  it('confirm() resolves from the dialog and the modal leaves the stack', async () => {
    const { get, confirm, confirmOk, closeModal } = await boot();
    const yes = confirm({ title: 'Delete?', body: 'Sure?', ok: 'Delete' });
    expect(get().ui.modals.at(-1)?.type).toBe('confirm');
    confirmOk();
    await expect(yes).resolves.toBe(true);
    const no = confirm({ title: 'Delete?', body: 'Sure?', ok: 'Delete', typeName: 'Website Redesign' });
    confirmOk();
    expect(get().ui.modals).toHaveLength(1);
    closeModal();
    await expect(no).resolves.toBe(false);
    expect(get().ui.modals).toHaveLength(0);
  });
});
