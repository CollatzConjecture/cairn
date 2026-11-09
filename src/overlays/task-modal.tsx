/* The task form: new task, or edit an existing one. */
import { useRef } from 'react';
import { Calendar, CalendarArrowUp, Circle, CircleAlert, Paperclip, Plus, Repeat, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { Label as FormLabel } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AssigneePicker, DatePicker, LabelsPicker, PriorityPicker, ProjectPicker, RecurPicker, StatusPicker } from '../components/pickers';
import { FT, MOD, fileType, fsize } from '../domain/constants';
import { fmtDate } from '../domain/date';
import { fileId, subtaskId, taskId, uid, type TaskId } from '../domain/ids';
import {
  applyPatch,
  closeModal,
  createTask,
  get,
  memberById,
  mutate,
  openTask,
  pColor,
  projectById,
  set,
  setTaskDate,
  taskById,
  toast,
  updateTask,
  useStore,
  type TaskForm,
} from '../store';
import { Avatar, Dot, Label, PriorityPill, StatusPill } from '../ui/helpers';
import { Icon } from '../ui/icon';
import { ModalFrame } from './modal-frame';
import { esc } from './parts';

const setForm = (fn: (f: TaskForm) => void) =>
  set(s => {
    if (s.ui.form) fn(s.ui.form);
  });
const plain = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Returns false when the title is missing (the caller refocuses it). */
function submitTask(edit: TaskId | null): boolean {
  const f = get().ui.form;
  if (!f) return true;
  const title = f.title.trim();
  if (!title) {
    set(s => {
      s.ui.errors.title = 'Give the task a name';
    });
    return false;
  }
  const me = get().data.me;
  const files = f.files.map(x => ({ id: fileId(uid('a')), name: x.name, type: x.type, size: x.size, by: me, at: Date.now() }));
  const base = {
    title,
    project: f.project,
    status: f.status,
    assignee: f.assignee,
    priority: f.priority,
    due: f.due,
    start: f.start && f.due && f.start > f.due ? f.due : f.start,
    labels: f.labels,
    recur: f.recur,
    subtasks: f.subtasks,
  };
  const desc = f.desc ? `<p>${esc(f.desc)}</p>` : '';
  set(s => {
    s.ui.errors = {};
  });
  if (edit) {
    const ok = mutate(s => {
      const t = taskById(s.data, edit);
      if (!t) return;
      applyPatch(s, t, base);
      if (f.desc !== plain(t.desc)) t.desc = desc;
      t.attachments.push(...files);
    });
    if (!ok) return true;
    closeModal();
    toast('Changes saved');
    return true;
  }
  const id = taskId(uid('t'));
  const ok = mutate(s => {
    const t = createTask(s, { ...base, id, desc, attachments: files });
    if (t) s.data.files.unshift(...files.map(x => ({ ...x, project: t.project, task: t.id })));
  });
  const n = taskById(get().data, id);
  if (!ok || !n) return true;
  if (f.more) {
    setForm(x => Object.assign(x, { title: '', desc: '', subtasks: [], files: [] }));
    toast(`Created ${n.key}`, { ms: 2000 });
    return false;
  }
  closeModal();
  toast(`Created ${n.key} in ${projectById(get().data, n.project)?.name}`, { action: 'Open', onAction: () => openTask(id) });
  return true;
}

const chip =
  'inline-flex h-6.5 items-center gap-1.5 rounded-md border bg-background px-2 text-sm whitespace-nowrap transition-colors hover:bg-muted active:scale-97 aria-expanded:bg-muted [&_svg]:shrink-0';
const fieldLabel = 'text-sm font-medium';

export function TaskModal({ edit }: { edit: TaskId | null }) {
  const f = useStore(s => s.ui.form);
  const err = useStore(s => s.ui.errors.title);
  const d = useStore(s => s.data);
  const titleRef = useRef<HTMLInputElement>(null);
  if (!f) return null;
  const p = projectById(d, f.project);
  const who = memberById(d, f.assignee);
  const t = taskById(d, edit);
  const submit = () => {
    if (!submitTask(edit)) titleRef.current?.focus();
  };
  return (
    <ModalFrame
      title={edit ? 'Edit task' : 'New task'}
      sub={t && <span className="font-mono">{t.key}</span>}
      initialFocus={titleRef}
      onSubmit={submit}
      footer={
        <>
          {!edit && (
            <FormLabel className="cursor-pointer gap-2 text-sm font-normal text-fg-2">
              <Switch checked={f.more} onCheckedChange={v => setForm(x => void (x.more = v))} />
              Create more
            </FormLabel>
          )}
          <span className="flex-1" />
          <span className="flex gap-0.5 max-sm:hidden" aria-hidden="true">
            <Kbd>{MOD}</Kbd>
            <Kbd>↵</Kbd>
          </span>
          <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
          <Button type="submit">{edit ? 'Save changes' : 'Create task'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-1.5">
        <Input
          ref={titleRef}
          className="h-9 text-[15px] font-medium"
          placeholder="Task name"
          aria-label="Task name"
          aria-invalid={!!err}
          aria-describedby={err ? 'f-title-err' : undefined}
          value={f.title}
          onChange={e => {
            const v = e.currentTarget.value;
            set(s => {
              if (s.ui.form) s.ui.form.title = v;
              if (v.trim()) s.ui.errors.title = null;
            });
          }}
        />
        {err && (
          <span id="f-title-err" className="flex items-center gap-1 text-xs text-destructive">
            <CircleAlert className="size-3" />
            {err}
          </span>
        )}
      </div>
      <Textarea
        className="min-h-19.5 resize-y"
        rows={3}
        placeholder="Add a description… (optional)"
        aria-label="Description"
        value={f.desc}
        onChange={e => {
          const v = e.currentTarget.value;
          setForm(x => void (x.desc = v));
        }}
      />
      <div className="flex flex-wrap gap-1.5">
        <ProjectPicker value={f.project} onChange={project => updateTask('form', { project })}>
          <button type="button" className={chip} aria-label={`Project: ${p?.name ?? ''}`}>
            <Dot c={pColor(p)} />
            {p?.name || 'Project'}
          </button>
        </ProjectPicker>
        <StatusPicker value={f.status} onChange={status => updateTask('form', { status })}>
          <button type="button" className={chip} aria-label="Status">
            <StatusPill st={f.status} />
          </button>
        </StatusPicker>
        <AssigneePicker value={f.assignee} onChange={assignee => updateTask('form', { assignee })}>
          <button type="button" className={chip} aria-label="Assignee">
            <Avatar id={f.assignee} size="sm" tip={false} />
            {who?.name || 'Assignee'}
          </button>
        </AssigneePicker>
        <PriorityPicker value={f.priority} onChange={priority => updateTask('form', { priority })}>
          <button type="button" className={chip} aria-label="Priority">
            <PriorityPill p={f.priority} />
          </button>
        </PriorityPicker>
        <DatePicker value={f.due} onChange={v => setTaskDate('form', 'due', v)}>
          <button type="button" className={chip} aria-label="Due date">
            <Calendar className="size-3.25" />
            {f.due ? 'Due ' + fmtDate(f.due) : 'Due date'}
          </button>
        </DatePicker>
        <DatePicker value={f.start} onChange={v => setTaskDate('form', 'start', v)}>
          <button type="button" className={chip} aria-label="Start date">
            <CalendarArrowUp className="size-3.25" />
            {f.start ? 'Starts ' + fmtDate(f.start) : 'Start date'}
          </button>
        </DatePicker>
        <LabelsPicker value={f.labels} onChange={labels => updateTask('form', { labels })}>
          <button type="button" className={cn(chip, 'gap-1')} aria-label="Labels">
            {f.labels.length ? (
              f.labels.map(l => <Label key={l} id={l} />)
            ) : (
              <>
                <Tag className="size-3.25" />
                Labels
              </>
            )}
          </button>
        </LabelsPicker>
        <RecurPicker value={f.recur} onChange={recur => updateTask('form', { recur })}>
          <button type="button" className={chip} aria-label="Repeat">
            <Repeat className="size-3.25" />
            {f.recur || 'Repeat'}
          </button>
        </RecurPicker>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className={fieldLabel}>Subtasks</span>
        {f.subtasks.map((s, i) => (
          <div key={s.id} className="flex min-h-8 items-center gap-2.25 rounded-sm px-1 text-base">
            <Circle className="size-3.25 text-fg-4" />
            <span className="min-w-0 flex-1 truncate">{s.title}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`Remove subtask ${s.title}`}
              onClick={() => setForm(x => void x.subtasks.splice(i, 1))}
            >
              <X className="size-3" />
            </Button>
          </div>
        ))}
        <div className="relative flex items-center">
          <Plus className="pointer-events-none absolute left-2.25 size-3.5 text-fg-4" />
          <Input
            className="pl-7.5"
            placeholder="Add a subtask and press Enter"
            aria-label="Add a subtask"
            onKeyDown={e => {
              if (e.key !== 'Enter' || e.shiftKey || e.metaKey || e.ctrlKey) return;
              e.preventDefault();
              const v = e.currentTarget.value.trim();
              if (!v) return;
              setForm(x => void x.subtasks.push({ id: subtaskId(uid('s')), title: v, done: false }));
              e.currentTarget.value = '';
            }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className={fieldLabel}>Attachments</span>
        {f.files.length > 0 && (
          <div className="flex flex-col gap-1">
            {f.files.map((x, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-sm">
                <span className="grid size-5.5 shrink-0 place-items-center rounded-md bg-(--c)/14 text-tint" style={{ '--c': FT[x.type].c }}>
                  <Icon name={FT[x.type].i} className="size-3" />
                </span>
                <span className="min-w-0 flex-1 truncate">{x.name}</span>
                <span className="text-2xs text-muted-foreground">{x.size}</span>
                <Button type="button" variant="ghost" size="icon-xs" aria-label={`Remove ${x.name}`} onClick={() => setForm(y => void y.files.splice(i, 1))}>
                  <X className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-input p-2.5 text-sm text-fg-2 transition-colors hover:bg-muted">
          <Paperclip className="size-3.5" />
          <span>Attach files</span>
          <input
            type="file"
            multiple
            hidden
            onChange={e => {
              const picked = [...(e.currentTarget.files ?? [])].map(x => ({ name: x.name, size: fsize(x.size), type: fileType(x.name) }));
              setForm(y => void y.files.push(...picked));
              e.currentTarget.value = '';
            }}
          />
        </label>
      </div>
    </ModalFrame>
  );
}
