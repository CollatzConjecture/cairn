/* The team dialog. `ModalsLayer` (src/overlays/modals.tsx) renders `TeamModal` inside the shadcn
   `DialogContent` for `{ type: 'team' }`; this file owns the form, its validation, and creating, saving and deleting teams. */
import { Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { PCOLORS, PICONS, type ProjectColor } from '../domain/constants';
import { teamId, uid, type TeamId } from '../domain/ids';
import type { TeamForm } from '../store';
import { closeModal, confirm, currentRoute, get, go, memberById, mutate, openModal, restore, set, snapshot, teamById, toast, useStore } from '../store';
import { Avatar } from '../ui/helpers';
import { Icon } from '../ui/icon';
import { Swatches } from './kit';
import { TeamIcon } from './teams-grid';

const COLORS = ['indigo', 'blue', 'violet', 'teal', 'rose', 'amber', 'green', 'slate'] as const satisfies readonly ProjectColor[];
const COLOR_OPTIONS = COLORS.map(k => ({ value: k, c: PCOLORS[k], label: k }));

/** Fill the form from the team and open the dialog. */
export function editTeam(id: TeamId) {
  const d = get().data;
  const t = teamById(d, id);
  if (!t) return;
  set(s => {
    s.ui.errors = {};
    s.ui.tform = {
      name: t.name,
      desc: t.desc,
      icon: t.icon,
      color: COLORS.find(k => PCOLORS[k] === t.c) ?? 'slate',
      members: d.members.filter(m => m.team === id).map(m => m.id),
    };
  });
  openModal({ type: 'team', edit: id });
}

const setForm = (fn: (f: TeamForm) => void) =>
  set(s => {
    if (s.ui.tform) fn(s.ui.tform);
  });
const setErr = (e: string | null) =>
  set(s => {
    s.ui.errors.tname = e;
  });

/** A name is required and unique; members listed here move into the team. */
export function submitTeam(edit: TeamId | null) {
  const { data: d, ui } = get();
  const f = ui.tform;
  if (!f) return;
  const name = f.name.trim();
  if (!name) return setErr('Give the team a name');
  if (d.teams.some(t => t.name.toLowerCase() === name.toLowerCase() && t.id !== edit)) return setErr(`A team called “${name}” already exists`);
  const id = edit ?? teamId(uid('tm'));
  const ok = mutate(s => {
    const c = PCOLORS[f.color];
    const t = teamById(s.data, id);
    if (t) Object.assign(t, { name, desc: f.desc.trim(), icon: f.icon, c });
    else s.data.teams.push({ id, name, desc: f.desc.trim() || 'No description yet.', icon: f.icon, c });
    s.data.members.forEach(m => {
      if (f.members.includes(m.id)) m.team = id;
      else if (m.team === id) m.team = null;
    });
  });
  if (!ok) return;
  closeModal();
  if (edit) toast(`Saved ${name}`);
  else {
    go({ r: 'team', id });
    toast(`Created ${name}`);
  }
}

/** People and projects stay; they just lose the team. */
export async function delTeam(id: TeamId) {
  const d = get().data;
  const t = teamById(d, id);
  if (!t) return;
  const n = d.members.filter(m => m.team === id).length;
  const np = d.projects.filter(p => p.team === id).length;
  closeModal();
  const ok = await confirm({
    title: `Delete ${t.name}?`,
    body: [
      ...(n ? [{ b: `${n} member${n > 1 ? 's' : ''}` }, ' will have no team'] : ['The team has no members']),
      ...(np ? [' and ', { b: `${np} project${np > 1 ? 's' : ''}` }, ' will need a new team'] : []),
      '. People and projects are not deleted.',
    ],
    ok: 'Delete team',
    danger: true,
    icon: 'users',
  });
  if (!ok) return;
  const snap = snapshot();
  if (
    mutate(s => {
      s.data.teams = s.data.teams.filter(x => x.id !== id);
      s.data.members.forEach(m => {
        if (m.team === id) m.team = null;
      });
      s.data.projects.forEach(p => {
        if (p.team === id) p.team = null;
      });
    })
  ) {
    if (currentRoute()?.r === 'team') go({ r: 'teams' });
    toast(`Deleted ${t.name}`, { action: 'Undo', onAction: () => restore(snap) });
  }
}

const fieldLabel = 'text-sm font-medium text-foreground';

/** The new/edit team form: header, fields, footer. `ModalsLayer` provides the padded `DialogContent` (and its close button) around it. */
export function TeamModal({ edit }: { edit: TeamId | null }) {
  const f = useStore(s => s.ui.tform);
  const err = useStore(s => s.ui.errors.tname);
  const d = useStore(s => s.data);
  if (!f) return null;
  const people = d.members.filter(m => m.status !== 'deactivated');
  return (
    <>
      <DialogHeader className="gap-0.5">
        <DialogTitle className="text-md leading-snug font-semibold">{edit ? 'Edit team' : 'New team'}</DialogTitle>
        {!edit && <DialogDescription className="text-sm text-fg-2">Teams group the people who work on projects together.</DialogDescription>}
      </DialogHeader>
      <form
        className="flex min-w-0 flex-col gap-3.5"
        noValidate
        onSubmit={e => {
          e.preventDefault();
          submitTeam(edit);
        }}
      >
        <div className="flex items-start gap-2.5">
          <TeamIcon t={{ icon: f.icon, c: PCOLORS[f.color] }} className="mt-5.5 size-9" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Label htmlFor="tm-name" className={fieldLabel}>
              Team name
            </Label>
            <Input
              id="tm-name"
              autoFocus
              placeholder="e.g. Growth"
              value={f.name}
              aria-invalid={!!err}
              aria-describedby={err ? 'tm-name-err' : undefined}
              onChange={e => {
                const v = e.currentTarget.value;
                setForm(x => void (x.name = v));
                if (err && v.trim()) setErr(null);
              }}
            />
            {err && (
              <span id="tm-name-err" role="alert" className="text-xs text-destructive">
                {err}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tm-desc" className={fieldLabel}>
            What does this team own?
          </Label>
          <Input
            id="tm-desc"
            placeholder="e.g. Acquisition experiments and lifecycle email"
            value={f.desc}
            onChange={e => {
              const v = e.currentTarget.value;
              setForm(x => void (x.desc = v));
            }}
          />
        </div>
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex min-w-55 flex-1 flex-col gap-1.5">
            <span className={fieldLabel}>Icon</span>
            <div className="grid grid-cols-[repeat(8,minmax(0,1fr))] gap-1" role="radiogroup" aria-label="Icon">
              {PICONS.map(i => (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={f.icon === i}
                  aria-label={i}
                  className={cn(
                    'grid h-8 place-items-center rounded-md text-fg-2 transition-[background-color,transform] hover:bg-muted active:scale-[0.94]',
                    f.icon === i && 'bg-primary-soft text-primary ring-1 ring-primary-line hover:bg-primary-soft',
                  )}
                  onClick={() => setForm(x => void (x.icon = i))}
                >
                  <Icon name={i} className="size-3.75" />
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className={fieldLabel}>Color</span>
            <Swatches
              label="Color"
              className="grid max-w-35 grid-cols-4"
              value={f.color}
              options={COLOR_OPTIONS}
              onChange={v => setForm(x => void (x.color = v))}
            />
          </div>
        </div>
        <fieldset className="flex flex-col gap-1.5">
          <legend className={cn(fieldLabel, 'mb-1.5')}>
            Members <span className="font-normal text-muted-foreground">{`· ${f.members.length} selected`}</span>
          </legend>
          <div className="max-h-55 overflow-y-auto rounded-xl border p-1">
            {people.map(m => {
              const other = m.team && m.team !== edit ? teamById(d, m.team)?.name : '';
              return (
                <Label key={m.id} className="flex min-h-9 items-center gap-2.5 rounded-md px-2 font-normal hover:bg-muted">
                  <Checkbox
                    checked={f.members.includes(m.id)}
                    onCheckedChange={on => setForm(x => void (x.members = on ? [...x.members, m.id] : x.members.filter(i => i !== m.id)))}
                  />
                  <Avatar id={m.id} size="sm" tip={false} />
                  <span className="min-w-0 flex-1 truncate">{memberById(d, m.id)?.name}</span>
                  {other && <span className="text-xs text-muted-foreground">{other}</span>}
                </Label>
              );
            })}
          </div>
          <span className="text-xs text-muted-foreground">Everyone belongs to one primary team. Adding someone here moves them from their current team.</span>
        </fieldset>
        <DialogFooter className="mt-1 flex-row items-center rounded-none bg-transparent px-4 py-3">
          {edit && (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => void delTeam(edit)}
            >
              <Trash />
              Delete team
            </Button>
          )}
          <Button type="button" variant="outline" className="ml-auto" onClick={closeModal}>
            Cancel
          </Button>
          <Button type="submit">{edit ? 'Save changes' : 'Create team'}</Button>
        </DialogFooter>
      </form>
    </>
  );
}
