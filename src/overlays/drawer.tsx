/* The task drawer: a side panel over the page, or a centred full page with a scrim (`ui.drawerFull`). */
import { useEffect, useRef, useState, type ReactElement } from 'react';
import {
  Bold,
  Calendar,
  CalendarArrowUp,
  Circle,
  CircleCheck,
  CircleDot,
  ClockAlert,
  Ellipsis,
  Folder,
  GitBranch,
  Heading,
  Italic,
  Link,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  Paperclip,
  Plus,
  Repeat,
  SignalHigh,
  Star,
  Tag,
  Timer,
  Upload,
  User,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { DatePicker, DepsPicker, EstimatePicker, LabelsPicker, RecurPicker } from '../components/pickers';
import { CellAssignee, CellDue, CellPriority, CellProject, CellStatus, pill } from '../components/task-list';
import { TaskMenu } from '../components/task-menu';
import { FT, fileType } from '../domain/constants';
import { TODAY, ago, diffD, fmtDate, parse } from '../domain/date';
import type { Attachment, Task } from '../domain/schema';
import {
  commentsOf,
  copyLink,
  get,
  go,
  isOver,
  logAct,
  memberById,
  mutate,
  pColor,
  projectById,
  openModal,
  set,
  setTaskDate,
  setUi,
  taskById,
  toast,
  toggleDone,
  toggleFavTask,
  updateTask,
  uploadFiles,
  useStore,
} from '../store';
import { Avatar, Dot, FilePreview, Label, Tip } from '../ui/helpers';
import { Icon } from '../ui/icon';
import { CommentBox, CommentItem } from './comment';
import { PropRow, Section } from './parts';
import { SubtaskView, Subtasks, closeSub } from './subtasks';

export const closeDrawer = () =>
  set(s => {
    s.ui.drawer = null;
    s.ui.drawerFull = false;
    s.ui.subOpen = null;
  });
const toggleDrawerFull = () =>
  set(s => {
    s.ui.drawerFull = !s.ui.drawerFull;
  });

function rmAttach(t: Task, f: Attachment) {
  if (
    mutate(s => {
      const x = taskById(s.data, t.id);
      if (!x) return;
      x.attachments = x.attachments.filter(a => a.id !== f.id);
      logAct(s.data, 'removed a file from', x);
    })
  )
    toast(`Removed ${f.name}`);
}
/** Description edits save as you type, without an activity entry. */
const saveDesc = (t: Task, html: string) =>
  set(s => {
    const x = taskById(s.data, t.id);
    if (!x) return;
    x.desc = html;
    x.updated = Date.now();
  });

const RTE = [
  ['bold', Bold, 'Bold'],
  ['italic', Italic, 'Italic'],
  ['insertUnorderedList', List, 'Bulleted list'],
  ['insertOrderedList', ListOrdered, 'Numbered list'],
  ['formatBlock:h4', Heading, 'Heading'],
  ['createLink', Link, 'Link'],
] as const;

function Description({ t }: { t: Task }) {
  const ed = useRef<HTMLDivElement>(null);
  // The editor owns its DOM while open; React writes the stored HTML once per task so typing never moves the caret.
  const [html] = useState(t.desc);
  const run = (cmd: string) => {
    const [c = '', arg] = cmd.split(':');
    if (c === 'createLink') {
      const sel = String(getSelection());
      if (/^https?:\/\//.test(sel)) document.execCommand('createLink', false, sel);
      else toast('Select a URL starting with https:// to turn it into a link', { kind: 'info' });
    } else document.execCommand(c, false, arg ? `<${arg}>` : undefined);
    if (ed.current) saveDesc(t, ed.current.innerHTML);
  };
  return (
    <section className="group/desc mt-6.5">
      <div className="mb-2 flex items-center gap-2">
        <h3 id="d-desc-l" className="text-base font-semibold">
          Description
        </h3>
        <div
          className="ml-auto flex gap-px opacity-0 transition-opacity group-focus-within/desc:opacity-100 group-hover/desc:opacity-100 max-sm:opacity-100"
          role="toolbar"
          aria-label="Formatting"
          aria-controls="d-desc"
        >
          {RTE.map(([cmd, I, name]) => (
            <Tip key={cmd} label={name}>
              <Button variant="ghost" size="icon-xs" aria-label={name} onMouseDown={e => e.preventDefault()} onClick={() => run(cmd)}>
                <I className="size-3.25" />
              </Button>
            </Tip>
          ))}
        </div>
      </div>
      <div
        ref={ed}
        id="d-desc"
        className="min-h-16 rounded-md border border-transparent px-2.5 py-2 text-base leading-[1.6] transition-colors outline-none group-hover/desc:border-border focus:border-input empty:before:text-muted-foreground empty:before:content-[attr(data-ph)] max-sm:border-border [&_a]:text-primary [&_a]:underline [&_h4]:mt-2.5 [&_h4]:mb-1 [&_h4]:text-md [&_h4]:font-semibold [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-1.5 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5"
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-labelledby="d-desc-l"
        data-ph="Add a description…"
        dangerouslySetInnerHTML={{ __html: html }}
        onInput={e => saveDesc(t, e.currentTarget.innerHTML)}
      />
    </section>
  );
}

function Attachments({ t }: { t: Task }) {
  const ups = useStore(s => s.ui.uploads).filter(u => u.task === t.id);
  const pickFiles = (files: FileList | null) => uploadFiles(files ?? [], { project: t.project, task: t.id });
  const fileInput = (
    <input
      type="file"
      multiple
      hidden
      onChange={e => {
        pickFiles(e.currentTarget.files);
        e.currentTarget.value = '';
      }}
    />
  );
  return (
    <Section
      title="Attachments"
      count={t.attachments.length}
      actions={
        <Button variant="ghost" size="sm" render={<label />} nativeButton={false}>
          <Upload />
          Upload
          {fileInput}
        </Button>
      }
    >
      {ups.map(u => (
        <div key={u.id} className="mb-1.5 flex items-center gap-2.5 rounded-lg border px-2.5 py-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-(--c)/14 text-tint" style={{ '--c': FT[fileType(u.name)].c }}>
            <Icon name={FT[fileType(u.name)].i} className="size-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex text-sm">
              <span className="truncate">{u.name}</span>
              <span className="ml-auto text-2xs text-muted-foreground tabular-nums">{`${u.pct}%`}</span>
            </div>
            <div className="mt-1.25 h-1 overflow-hidden rounded-full bg-muted-strong">
              <div className="h-full w-full origin-left bg-primary transition-transform duration-200" style={{ transform: `scaleX(${u.pct / 100})` }} />
            </div>
          </div>
        </div>
      ))}
      {t.attachments.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
          {t.attachments.map(f => (
            <div key={f.id} className="group/att relative overflow-hidden rounded-lg border bg-background text-xs">
              <FilePreview f={f} className="aspect-video rounded-none" />
              <div className="px-2.25 py-1.75">
                <button
                  className="block w-full truncate text-left font-medium outline-none after:absolute after:inset-0 focus-visible:after:rounded-lg focus-visible:after:outline-2 focus-visible:after:outline-ring"
                  onClick={() => openModal({ type: 'filePreview', file: f, tid: t.id })}
                >
                  {f.name}
                </button>
                <div className="text-muted-foreground">{`${FT[f.type].n} · ${f.size}`}</div>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                className="absolute top-1.25 right-1.25 z-10 bg-background opacity-0 ring-1 ring-border group-hover/att:opacity-100 focus-visible:opacity-100"
                aria-label={`Remove attachment ${f.name}`}
                onClick={() => rmAttach(t, f)}
              >
                <X className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        !ups.length && (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-input p-3 text-sm text-fg-2 transition-colors hover:bg-muted">
            <Paperclip className="size-3.75" />
            <span>Drop files or click to attach</span>
            {fileInput}
          </label>
        )
      )}
    </Section>
  );
}

function Conversation({ t }: { t: Task }) {
  const d = useStore(s => s.data);
  const tab = useStore(s => s.ui.drawerTab);
  const cs = commentsOf(d, t.id);
  const acts = d.activity.filter(a => a.task === t.id);
  const tabCls = 'flex-none px-2.5 text-sm';
  const ct = (n: number) => <span className="text-2xs font-normal text-muted-foreground tabular-nums">{n}</span>;
  return (
    <section className="mt-6.5">
      <Tabs value={tab} onValueChange={v => setUi('drawerTab', v === 'activity' ? 'activity' : 'comments')}>
        <TabsList variant="line" className="mb-1.5 h-9 w-full justify-start border-b">
          <TabsTrigger value="comments" className={tabCls}>
            Comments {ct(cs.length)}
          </TabsTrigger>
          <TabsTrigger value="activity" className={tabCls}>
            Activity {ct(acts.length)}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === 'comments' ? (
        <>
          {cs.length ? (
            cs.map(c => <CommentItem key={c.id} c={c} />)
          ) : (
            <p className="my-2.5 text-[13px] text-muted-foreground">No comments yet. Start the conversation.</p>
          )}
          <CommentBox tid={t.id} />
        </>
      ) : (
        <div className="pt-1">
          {acts.map(a => {
            const m = memberById(d, a.by);
            return (
              <div key={a.id} className="flex items-center gap-2.25 py-1.25 text-sm text-fg-2">
                <span className="grid size-5.5 place-items-center">
                  <Avatar id={a.by} size="sm" tip={false} />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="font-medium text-foreground">{m?.id === d.me ? 'You' : m?.name}</b> {a.verb.replace(/ of$/, '')}
                  {a.extra ? ' ' + a.extra : ''}
                </span>
                <time className="text-2xs text-muted-foreground">{ago(a.at)}</time>
              </div>
            );
          })}
          <div className="flex items-center gap-2.25 py-1.25 text-sm text-fg-2">
            <span className="grid size-5.5 place-items-center text-fg-4">
              <Plus className="size-3.25" />
            </span>
            <span className="flex-1">Task created</span>
            <time className="text-2xs text-muted-foreground">{ago(t.created)}</time>
          </div>
        </div>
      )}
    </section>
  );
}

const linkBtn = 'font-medium text-primary hover:underline hover:underline-offset-3';

function Banner({ t }: { t: Task }) {
  if (t.status === 'done')
    return (
      <div className="mb-3 flex items-center gap-2.5 rounded-lg border border-green/30 bg-green/8 px-3 py-2.5 text-sm" role="status">
        <CircleCheck className="size-3.75 shrink-0 text-green" />
        <span>
          {`Completed ${t.completedAt ? ago(t.completedAt) : ''}. `}
          <button className={linkBtn} onClick={() => toggleDone(t.id)}>
            Reopen task
          </button>
        </span>
      </div>
    );
  if (!isOver(t) || !t.due) return null;
  const n = -diffD(parse(t.due), TODAY);
  return (
    <div className="mb-3 flex items-center gap-2.5 rounded-lg border border-red/30 bg-red/8 px-3 py-2.5 text-sm" role="status">
      <ClockAlert className="size-3.75 shrink-0 text-red" />
      <span>
        {`Overdue by ${n} day${n > 1 ? 's' : ''}. `}
        <DatePicker value={t.due} onChange={v => setTaskDate(t.id, 'due', v)}>
          <button className={linkBtn}>Reschedule</button>
        </DatePicker>
      </span>
    </div>
  );
}

function Props({ t, full }: { t: Task; full: boolean }) {
  const tasks = useStore(s => s.data.tasks);
  const deps = t.deps.flatMap(id => tasks.filter(x => x.id === id));
  return (
    <dl
      className={cn(
        'mt-3 grid grid-cols-[112px_minmax(0,1fr)] items-center gap-y-0.5 text-sm max-sm:grid-cols-[96px_minmax(0,1fr)]',
        full && 'sm:grid-cols-[112px_minmax(0,1fr)_112px_minmax(0,1fr)]',
      )}
    >
      <PropRow icon={CircleDot} label="Status">
        <CellStatus t={t} />
      </PropRow>
      <PropRow icon={SignalHigh} label="Priority">
        <CellPriority t={t} />
      </PropRow>
      <PropRow icon={User} label="Assignee">
        <CellAssignee t={t} />
      </PropRow>
      <PropRow icon={Calendar} label="Due date">
        <CellDue t={t} />
      </PropRow>
      <PropRow icon={CalendarArrowUp} label="Start date">
        <DatePicker value={t.start} onChange={v => setTaskDate(t.id, 'start', v)}>
          <button className={pill} data-empty={t.start ? undefined : ''} aria-label="Start date">
            <Calendar className="size-3.25" />
            <span className="tabular-nums">{t.start ? fmtDate(t.start) : 'Set date'}</span>
          </button>
        </DatePicker>
      </PropRow>
      <PropRow icon={Folder} label="Project">
        <CellProject t={t} />
      </PropRow>
      <PropRow icon={Tag} label="Labels">
        <LabelsPicker value={t.labels} onChange={labels => updateTask(t.id, { labels })}>
          <button
            className={cn(pill, 'h-auto min-h-6.5 flex-wrap py-0.75 whitespace-normal')}
            data-empty={t.labels.length ? undefined : ''}
            aria-label="Labels"
          >
            {t.labels.length ? (
              t.labels.map(l => <Label key={l} id={l} />)
            ) : (
              <>
                <Tag className="size-3.25" />
                Add labels
              </>
            )}
          </button>
        </LabelsPicker>
      </PropRow>
      <PropRow icon={Repeat} label="Repeat">
        <RecurPicker value={t.recur} onChange={recur => updateTask(t.id, { recur })}>
          <button className={pill} data-empty={t.recur ? undefined : ''} aria-label={`Repeat: ${t.recur ?? 'Does not repeat'}`}>
            <Repeat className="size-3.25" />
            {t.recur ?? 'Does not repeat'}
          </button>
        </RecurPicker>
      </PropRow>
      <PropRow icon={Timer} label="Estimate">
        <EstimatePicker value={t.estimate} onChange={estimate => updateTask(t.id, { estimate })}>
          <button className={pill} data-empty={t.estimate ? undefined : ''} aria-label={`Estimate: ${t.estimate ?? 'none'}`}>
            <Timer className="size-3.25" />
            {t.estimate ?? 'Add estimate'}
          </button>
        </EstimatePicker>
      </PropRow>
      <PropRow icon={GitBranch} label="Blocked by">
        <DepsPicker task={t} onChange={v => updateTask(t.id, { deps: v })}>
          <button
            className={cn(pill, 'h-auto min-h-6.5 flex-wrap py-0.75 whitespace-normal')}
            data-empty={deps.length ? undefined : ''}
            aria-label="Blocked by"
          >
            {deps.length ? (
              deps.map(x => (
                <span key={x.id} className="inline-flex min-w-0 items-center gap-1.5">
                  <span className="rounded-sm bg-muted-strong px-1.25 py-px font-mono text-2xs">{x.key}</span>
                  <span className="max-w-40 truncate">{x.title}</span>
                </span>
              ))
            ) : (
              <>
                <GitBranch className="size-3.25" />
                None
              </>
            )}
          </button>
        </DepsPicker>
      </PropRow>
    </dl>
  );
}

function TitleEdit({ t }: { t: Task }) {
  return (
    <textarea
      key={t.id + t.title}
      className="-mx-1.5 field-sizing-content w-[calc(100%+12px)] resize-none rounded-sm px-1.5 py-1 text-xl leading-[1.3] font-semibold tracking-[-0.018em] outline-none hover:bg-muted focus:bg-muted focus:ring-1 focus:ring-input"
      rows={1}
      aria-label="Task title"
      defaultValue={t.title}
      onBlur={e => {
        const v = e.currentTarget.value.trim();
        if (v && v !== t.title) updateTask(t.id, { title: v });
        else e.currentTarget.value = t.title;
      }}
      onKeyDown={e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
    />
  );
}

function Header({ t, full }: { t: Task; full: boolean }) {
  const p = useStore(s => projectById(s.data, t.project));
  const done = t.status === 'done';
  const icon = (label: string, el: ReactElement) => <Tip label={label}>{el}</Tip>;
  return (
    <div className="flex h-11.5 shrink-0 items-center gap-1 border-b pr-2.5 pl-4">
      <button className={cn(pill, 'min-w-0 text-sm')} onClick={() => p && go({ r: 'project', id: p.id, tab: 'board' })}>
        <Dot c={pColor(p)} />
        <span className="truncate">{p?.name}</span>
      </button>
      <span className="text-muted-foreground">/</span>
      <span className="px-1.5 font-mono text-[11.5px] text-muted-foreground">{t.key}</span>
      <span className="flex-1" />
      <Button
        variant={done ? 'secondary' : 'ghost'}
        size="sm"
        className={cn(done && 'text-green hover:text-green')}
        aria-label={done ? 'Completed' : 'Mark complete'}
        onClick={() => toggleDone(t.id)}
      >
        {done ? <CircleCheck /> : <Circle />}
        <span className="max-sm:hidden">{done ? 'Completed' : 'Mark complete'}</span>
      </Button>
      {icon(
        t.fav ? 'Unfavorite' : 'Favorite',
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(t.fav && 'text-amber hover:text-amber')}
          aria-label="Favorite"
          aria-pressed={t.fav}
          onClick={() => toggleFavTask(t.id)}
        >
          <Star />
        </Button>,
      )}
      {icon(
        'Copy link',
        <Button variant="ghost" size="icon-sm" aria-label="Copy link" onClick={() => copyLink({ task: t.id })}>
          <Link />
        </Button>,
      )}
      {icon(
        full ? 'Side panel' : 'Full page',
        <Button variant="ghost" size="icon-sm" className="max-sm:hidden" aria-label="Toggle full page" aria-pressed={full} onClick={toggleDrawerFull}>
          {full ? <Minimize2 /> : <Maximize2 />}
        </Button>,
      )}
      <TaskMenu id={t.id}>
        <Button variant="ghost" size="icon-sm" aria-label="More actions">
          <Ellipsis />
        </Button>
      </TaskMenu>
      <Tip label="Close  Esc">
        <SheetClose render={<Button variant="ghost" size="icon-sm" aria-label="Close" />}>
          <X className="size-4" />
        </SheetClose>
      </Tip>
    </div>
  );
}

export function DrawerLayer() {
  const id = useStore(s => s.ui.drawer);
  const full = useStore(s => s.ui.drawerFull);
  const sub = useStore(s => s.ui.subOpen);
  // The last opened task stays rendered while the panel animates out.
  const [shown, setShown] = useState(id);
  if (id && id !== shown) setShown(id);
  const t = useStore(s => taskById(s.data, shown));
  const popup = useRef<HTMLDivElement>(null);
  // Focus returns to whatever outside the panel last opened a task in it.
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const a = document.activeElement;
    if (id && a instanceof HTMLElement && a !== document.body && !popup.current?.contains(a)) opener.current = a;
  }, [id]);
  const st = t && sub?.tid === t.id ? t.subtasks.find(x => x.id === sub.sid) : undefined;
  return (
    <Sheet
      open={!!id && !!t}
      modal={full}
      disablePointerDismissal={!full}
      onOpenChange={(open, e) => {
        if (open) return;
        if (e.reason === 'escape-key' && get().ui.subOpen) {
          e.cancel();
          closeSub();
          return;
        }
        closeDrawer();
      }}
      onOpenChangeComplete={open => {
        if (!open) setShown(null);
      }}
    >
      <SheetContent
        ref={popup}
        initialFocus={popup}
        finalFocus={opener}
        showCloseButton={false}
        overlay={full}
        className={cn(
          'gap-0 p-0 outline-none data-[side=right]:w-[min(620px,100vw)] data-[side=right]:sm:max-w-none',
          full &&
            'data-[side=right]:inset-y-6 data-[side=right]:left-0 mx-auto rounded-xl border data-[side=right]:h-auto data-[side=right]:w-[min(980px,calc(100vw-48px))] data-[side=right]:data-ending-style:translate-x-0 data-[side=right]:data-starting-style:translate-x-0',
          'max-sm:data-[side=right]:inset-0 max-sm:data-[side=right]:h-full max-sm:data-[side=right]:w-full max-sm:rounded-none max-sm:border-0',
        )}
        onDragOver={e => {
          if (e.dataTransfer.types.includes('Files')) e.preventDefault();
        }}
        onDrop={e => {
          if (!t || !e.dataTransfer.files.length) return;
          e.preventDefault();
          uploadFiles(e.dataTransfer.files, { project: t.project, task: t.id });
        }}
      >
        {t && (
          <>
            <SheetTitle className="sr-only">{st ? `Subtask: ${st.title}` : `Task: ${t.title}`}</SheetTitle>
            <Header t={t} full={full} />
            <div className={cn('flex-1 overflow-y-auto px-6 pt-5 pb-8', full && 'sm:px-12 sm:pt-7 sm:pb-10', 'max-sm:px-4 max-sm:pt-4 max-sm:pb-10')}>
              {st ? (
                <SubtaskView t={t} s={st} />
              ) : (
                <div key={t.id}>
                  <Banner t={t} />
                  <TitleEdit t={t} />
                  <Props t={t} full={full} />
                  <Description t={t} />
                  <Subtasks t={t} />
                  <Attachments t={t} />
                  <Conversation t={t} />
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
