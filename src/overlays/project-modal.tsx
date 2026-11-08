/* The project form: new project, or project settings. */
import { useRef } from 'react';
import { Check, CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { PCOLORS, PICONS, TEMPLATES, type ProjectColor, type TemplateId } from '../domain/constants';
import type { MemberId, ProjectId, TeamId } from '../domain/ids';
import { closeModal, createProject, get, go, mutate, projectById, set, tasksOf, toast, useStore, type ProjectForm } from '../store';
import { Icon, type IconName } from '../ui/icon';
import { ModalFrame } from './modal-frame';

const setPform = (fn: (f: ProjectForm) => void) =>
  set(s => {
    if (s.ui.pform) fn(s.ui.pform);
  });

/** Picks a template; its icon replaces the default folder icon. */
function pickTemplate(id: TemplateId) {
  setPform(f => {
    f.tmpl = id;
    const t = TEMPLATES.find(x => x.id === id);
    if (t && f.icon === 'folder') f.icon = t.icon === 'file' ? 'folder' : t.icon;
  });
}

/** Returns false when the name is missing (the caller refocuses it). */
function submitProject(edit: ProjectId | null): boolean {
  const f = get().ui.pform;
  if (!f) return true;
  const name = f.name.trim();
  if (!name) {
    set(s => {
      s.ui.errors.pname = 'Give the project a name';
    });
    return false;
  }
  if (edit) {
    const ok = mutate(s => {
      const p = projectById(s.data, edit);
      if (p)
        Object.assign(p, {
          name,
          desc: f.desc,
          icon: f.icon,
          color: f.color,
          team: f.team,
          lead: f.lead,
          due: f.due,
          members: [...new Set([...p.members, f.lead])],
        });
    });
    if (ok) {
      closeModal();
      toast('Project updated');
    }
    return true;
  }
  const made: { id?: ProjectId } = {};
  if (!mutate(s => void (made.id = createProject(s, { ...f, name }, f.tmpl).id))) return true;
  const pid = made.id;
  if (!pid) return true;
  closeModal();
  go({ r: 'project', id: pid, tab: f.tmpl === 'blank' ? 'overview' : (get().prefs.defaultTab ?? 'board') });
  const n = tasksOf(get().data, pid).length;
  toast(`Created ${name}${n ? ` with ${n} starter tasks` : ''}`);
  return true;
}

const fieldLabel = 'text-sm font-medium';
const isColor = (k: string): k is ProjectColor => k in PCOLORS;
const pick = 'grid place-items-center rounded-md transition-[background-color,box-shadow,transform] active:scale-[0.97]';

export function ProjectModal({ edit }: { edit: ProjectId | null }) {
  const f = useStore(s => s.ui.pform);
  const err = useStore(s => s.ui.errors.pname);
  const d = useStore(s => s.data);
  const nameRef = useRef<HTMLInputElement>(null);
  if (!f) return null;
  const teams = d.teams.map(t => ({ value: t.id, label: t.name }));
  const leads = d.members.filter(m => m.status === 'active').map(m => ({ value: m.id, label: m.name }));
  return (
    <ModalFrame
      title={edit ? 'Project settings' : 'New project'}
      sub={edit ? undefined : 'Projects hold tasks, files, and conversations for one body of work.'}
      initialFocus={nameRef}
      onSubmit={() => {
        if (!submitProject(edit)) nameRef.current?.focus();
      }}
      footer={
        <>
          <span className="flex-1" />
          <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
          <Button type="submit">{edit ? 'Save changes' : 'Create project'}</Button>
        </>
      }
    >
      <div className="flex items-start gap-2.5">
        <span
          className="mt-5.5 grid size-9 shrink-0 place-items-center rounded-lg bg-(--c)/16 text-tint"
          style={{ '--c': PCOLORS[f.color] }}
          aria-hidden="true"
        >
          <Icon name={f.icon} className="size-4.5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label className={fieldLabel} htmlFor="p-name">
            Project name
          </label>
          <Input
            ref={nameRef}
            id="p-name"
            placeholder="e.g. Website Redesign"
            aria-invalid={!!err}
            value={f.name}
            onChange={e => {
              const v = e.currentTarget.value;
              set(s => {
                if (s.ui.pform) s.ui.pform.name = v;
                if (v.trim()) s.ui.errors.pname = null;
              });
            }}
          />
          {err && (
            <span className="flex items-center gap-1 text-xs text-destructive">
              <CircleAlert className="size-3" />
              {err}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className={fieldLabel} htmlFor="p-desc">
          Description
        </label>
        <Textarea
          id="p-desc"
          rows={2}
          className="min-h-18 resize-y"
          placeholder="What is this project about?"
          value={f.desc}
          onChange={e => {
            const v = e.currentTarget.value;
            setPform(x => void (x.desc = v));
          }}
        />
      </div>
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-55 flex-1 flex-col gap-1.5">
          <span className={fieldLabel}>Icon</span>
          <div className="grid grid-cols-[repeat(8,minmax(0,1fr))] gap-1" role="radiogroup" aria-label="Icon">
            {PICONS.map((i: IconName) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={f.icon === i}
                aria-label={i}
                className={cn(
                  pick,
                  'h-8 text-fg-2 hover:bg-muted',
                  f.icon === i && 'bg-primary-soft text-primary ring-1 ring-primary-line hover:bg-primary-soft',
                )}
                onClick={() => setPform(x => void (x.icon = i))}
              >
                <Icon name={i} className="size-3.75" />
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5 max-sm:w-full">
          <span className={fieldLabel}>Color</span>
          <div className="grid max-w-35 grid-cols-4 gap-2" role="radiogroup" aria-label="Color">
            {Object.keys(PCOLORS)
              .filter(isColor)
              .map(k => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={f.color === k}
                  aria-label={k}
                  className={cn(pick, 'size-5.5 rounded-full bg-(--c) text-white', f.color === k && 'ring-2 ring-(--c) ring-offset-2 ring-offset-background')}
                  style={{ '--c': PCOLORS[k] }}
                  onClick={() => setPform(x => void (x.color = k))}
                >
                  {f.color === k && <Check className="size-3" />}
                </button>
              ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="flex min-w-37.5 flex-1 flex-col gap-1.5">
          <span className={fieldLabel} id="p-team-l">
            Team
          </span>
          <Select items={teams} value={f.team} onValueChange={v => setPform(x => void (x.team = v as TeamId | null))}>
            <SelectTrigger className="w-full" aria-labelledby="p-team-l">
              <SelectValue placeholder="No team" />
            </SelectTrigger>
            <SelectContent>
              {teams.map(t => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-37.5 flex-1 flex-col gap-1.5">
          <span className={fieldLabel} id="p-lead-l">
            Lead
          </span>
          <Select items={leads} value={f.lead} onValueChange={v => v && setPform(x => void (x.lead = v as MemberId))}>
            <SelectTrigger className="w-full" aria-labelledby="p-lead-l">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {leads.map(m => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-37.5 flex-1 flex-col gap-1.5">
          <label className={fieldLabel} htmlFor="p-due">
            Target date
          </label>
          <Input
            type="date"
            id="p-due"
            value={f.due}
            onChange={e => {
              const v = e.currentTarget.value;
              setPform(x => void (x.due = v));
            }}
          />
        </div>
      </div>
      {!edit && (
        <div className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Template</span>
          <div className="grid grid-cols-3 gap-2 max-sm:grid-cols-2" role="radiogroup" aria-label="Template">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={f.tmpl === t.id}
                className={cn(
                  'flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left text-xs text-muted-foreground transition-[background-color,border-color,transform] hover:bg-muted active:scale-[0.98]',
                  f.tmpl === t.id && 'border-primary bg-primary-soft ring-1 ring-primary hover:bg-primary-soft',
                )}
                onClick={() => pickTemplate(t.id)}
              >
                <Icon name={t.icon} className="mb-1 size-4 text-foreground" />
                <b className="text-sm font-medium text-foreground">{t.name}</b>
                <span>{t.tasks.length ? `${t.tasks.length} starter tasks` : t.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </ModalFrame>
  );
}
