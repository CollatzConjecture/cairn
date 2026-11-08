/* The shared task list: list rows and their cells, bulk actions, activity items, mini rows. */
import { Fragment, type ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Ellipsis,
  GripVertical,
  ListChecks,
  MessageSquare,
  Plus,
  Repeat,
  SignalHigh,
  Tag,
  Trash,
  User,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { PR, ST } from '../domain/constants';
import { ago, relDate } from '../domain/date';
import type { Activity, Task } from '../domain/schema';
import {
  bulkDelete,
  bulkSet,
  clearSel,
  commentsOf,
  commitComposer,
  commitTitle,
  editTitle,
  expandRow,
  isOver,
  memberById,
  newTask,
  openTask,
  pColor,
  projectById,
  selAll,
  selRow,
  setTaskDate,
  sortBy,
  startComposer,
  taskById,
  toggleDone,
  toggleGroup,
  toggleSub,
  updateTask,
  useStore,
  type Fx,
  type ViewKey,
} from '../store';
import { linkTo } from '../shell/shell';
import { Avatar, Due, Dot, Empty, Label, PriorityIcon, PriorityPill, StatusIcon, StatusPill, Tip } from '../ui/helpers';
import { AssigneePicker, DatePicker, LabelsPicker, MenuPicker, PRIORITY_OPTIONS, PriorityPicker, ProjectPicker, STATUS_OPTIONS, StatusPicker } from './pickers';
import { TaskContextMenu, TaskMenu } from './task-menu';
import type { TaskGroup } from './view-engine';

/** One-shot entrance for the row the last action created (`ui.fx.added`); movement is dropped under reduced motion. */
export const fxEnter = (fx: Fx, id: string) => fx.added === id && 'animate-in fade-in slide-in-from-bottom-2 duration-250';

/** A field cell: a borderless pill that opens its picker. */
export const pill =
  'inline-flex h-6.5 max-w-full items-center gap-1.5 rounded-md px-1.75 text-sm whitespace-nowrap text-foreground transition-colors hover:bg-muted active:scale-[0.97] aria-expanded:bg-muted data-[empty]:text-muted-foreground [&_svg]:shrink-0';

export const LCOLS = {
  status: ['Status', '126px'],
  assignee: ['Assignee', '150px'],
  priority: ['Priority', '108px'],
  due: ['Due date', '104px'],
  labels: ['Labels', '168px'],
  project: ['Project', '160px'],
} as const;
export type ListCol = keyof typeof LCOLS;

export const CellStatus = ({ t }: { t: Task }) => (
  <StatusPicker value={t.status} onChange={status => updateTask(t.id, { status })}>
    <button className={pill} aria-label={`Status: ${ST[t.status].name}`}>
      <StatusPill st={t.status} />
    </button>
  </StatusPicker>
);
export function CellAssignee({ t }: { t: Task }) {
  const m = useStore(s => memberById(s.data, t.assignee));
  return (
    <AssigneePicker value={t.assignee} onChange={assignee => updateTask(t.id, { assignee })}>
      <button className={pill} data-empty={m ? undefined : ''} aria-label={`Assignee: ${m?.name ?? 'Unassigned'}`}>
        <Avatar id={t.assignee} size="sm" tip={false} />
        <span className="truncate">{m ? m.name : 'Unassigned'}</span>
      </button>
    </AssigneePicker>
  );
}
export const CellPriority = ({ t }: { t: Task }) => (
  <PriorityPicker value={t.priority} onChange={priority => updateTask(t.id, { priority })}>
    <button className={pill} data-empty={t.priority === 'none' ? '' : undefined} aria-label={`Priority: ${PR[t.priority].name}`}>
      <PriorityPill p={t.priority} />
    </button>
  </PriorityPicker>
);
export const CellDue = ({ t }: { t: Task }) => (
  <DatePicker value={t.due} onChange={v => setTaskDate(t.id, 'due', v)}>
    <button className={cn(pill, isOver(t) && 'text-red')} data-empty={t.due ? undefined : ''} aria-label="Due date">
      <Calendar className="size-3.25" />
      {t.due ? <span className="tabular-nums">{relDate(t.due)}</span> : <span>Set date</span>}
    </button>
  </DatePicker>
);
export const CellLabels = ({ t }: { t: Task }) => (
  <LabelsPicker value={t.labels} onChange={labels => updateTask(t.id, { labels })}>
    <button className={cn(pill, 'gap-1 overflow-hidden')} data-empty={t.labels.length ? undefined : ''} aria-label="Labels">
      {t.labels.length ? (
        <>
          {t.labels.slice(0, 2).map(l => (
            <Label key={l} id={l} />
          ))}
          {t.labels.length > 2 && <span className="text-2xs text-muted-foreground">{`+${t.labels.length - 2}`}</span>}
        </>
      ) : (
        <>
          <Tag className="size-3.25" />
          <span>Add</span>
        </>
      )}
    </button>
  </LabelsPicker>
);
export function CellProject({ t }: { t: Task }) {
  const p = useStore(s => projectById(s.data, t.project));
  return (
    <ProjectPicker value={t.project} onChange={project => updateTask(t.id, { project })}>
      <button className={pill} aria-label={`Project: ${p?.name ?? ''}`}>
        <Dot c={pColor(p)} />
        <span className="truncate">{p?.name}</span>
      </button>
    </ProjectPicker>
  );
}
const CELL: Record<ListCol, (p: { t: Task }) => ReactNode> = {
  status: CellStatus,
  assignee: CellAssignee,
  priority: CellPriority,
  due: CellDue,
  labels: CellLabels,
  project: CellProject,
};

const cell = 'flex min-w-0 items-center gap-1.5 px-2 max-sm:p-0';

function TaskRow({
  t,
  cols,
  tpl,
  group,
  drag,
  complete,
  viewKey,
}: {
  t: Task;
  cols: readonly ListCol[];
  tpl: string;
  group: string;
  drag: boolean;
  complete: boolean;
  viewKey: ViewKey;
}) {
  const sel = useStore(s => s.ui.sel.includes(t.id));
  const open = useStore(s => !!s.ui.openTasks[t.id]);
  const editing = useStore(s => s.ui.editCell?.id === t.id && s.ui.editCell.f === 'title');
  const fx = useStore(s => s.ui.fx);
  const cc = useStore(s => commentsOf(s.data, t.id).length);
  const sd = t.subtasks.filter(s => s.done).length;
  const done = t.status === 'done';
  return (
    <>
      <TaskContextMenu id={t.id}>
        <div
          className={cn(
            'group/row relative grid min-h-(--row-h) grid-cols-(--cols) items-center border-b border-divider transition-colors hover:bg-muted',
            'max-sm:my-1.5 max-sm:flex max-sm:min-h-0 max-sm:flex-wrap max-sm:gap-x-1.5 max-sm:gap-y-1 max-sm:rounded-lg max-sm:border max-sm:border-border max-sm:px-1.5 max-sm:py-2.5',
            sel && 'bg-primary-soft hover:bg-primary-soft',
            fxEnter(fx, t.id),
          )}
          style={{ '--cols': tpl }}
          role="row"
          data-task-row={t.id}
          data-group={group}
          data-lkey={viewKey}
          data-selected={sel || undefined}
        >
          <div
            className="flex w-4 cursor-grab justify-center text-fg-4 opacity-0 group-hover/row:opacity-100 max-sm:hidden"
            draggable={drag}
            data-drag-row={t.id}
            aria-hidden="true"
          >
            {drag && <GripVertical className="size-3.5" />}
          </div>
          <div className={cn(cell, 'order-0')}>
            {complete ? (
              <Checkbox className="rounded-full" checked={done} onCheckedChange={() => toggleDone(t.id)} aria-label={`Mark ${t.title} complete`} />
            ) : (
              <Checkbox checked={sel} onCheckedChange={() => selRow(t.id)} aria-label={`Select ${t.title}`} />
            )}
          </div>
          <div className={cn(cell, 'relative gap-2 text-base max-sm:order-1 max-sm:basis-[calc(100%-30px)]')}>
            {t.subtasks.length ? (
              <Button
                variant="ghost"
                size="icon-xs"
                className="relative z-10 -ml-1"
                onClick={() => expandRow(t.id)}
                aria-label={`${open ? 'Hide' : 'Show'} subtasks`}
                aria-expanded={open}
              >
                {open ? <ChevronDown /> : <ChevronRight />}
              </Button>
            ) : (
              <span className="w-4.5 shrink-0" />
            )}
            <span className="shrink-0 font-mono text-2xs text-muted-foreground">{t.key}</span>
            {editing ? (
              <input
                className="h-full w-full bg-transparent text-base outline-none"
                id="edit-title"
                defaultValue={t.title}
                aria-label="Task title"
                autoFocus
                onFocus={e => e.currentTarget.select()}
                onBlur={e => commitTitle(e.currentTarget.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    commitTitle(e.currentTarget.value);
                  }
                }}
              />
            ) : (
              <button
                className={cn(
                  'truncate text-left outline-none after:absolute after:inset-0 hover:underline hover:decoration-input hover:underline-offset-3 focus-visible:after:rounded-sm focus-visible:after:outline-2 focus-visible:after:outline-ring',
                  done && 'text-muted-foreground line-through decoration-muted-foreground',
                )}
                onClick={() => openTask(t.id)}
                onDoubleClick={() => editTitle(t.id)}
              >
                {t.title}
              </button>
            )}
            {t.recur && (
              <Tip label={`Repeats ${t.recur.toLowerCase()}`}>
                <span className="relative inline-flex items-center text-muted-foreground">
                  <Repeat className="size-2.75" />
                </span>
              </Tip>
            )}
            {t.subtasks.length > 0 && (
              <span className="inline-flex items-center gap-0.75 text-2xs text-muted-foreground">
                <ListChecks className="size-2.75" />
                {`${sd}/${t.subtasks.length}`}
              </span>
            )}
            {cc > 0 && (
              <span className="inline-flex items-center gap-0.75 text-2xs text-muted-foreground">
                <MessageSquare className="size-2.75" />
                {cc}
              </span>
            )}
          </div>
          {cols.map(c => {
            const Cell = CELL[c];
            return (
              <div key={c} className={cn(cell, 'max-sm:order-2', c === 'labels' && !t.labels.length && 'max-sm:hidden')}>
                <Cell t={t} />
              </div>
            );
          })}
          <div className={cn(cell, 'max-sm:order-3 max-sm:ml-auto')}>
            <TaskMenu id={t.id}>
              <Button variant="ghost" size="icon-sm" aria-label="More actions">
                <Ellipsis />
              </Button>
            </TaskMenu>
          </div>
        </div>
      </TaskContextMenu>
      {open && (
        <div className="bg-sunken">
          {t.subtasks.map(s => (
            <label key={s.id} className="flex h-8 items-center gap-2 border-b border-divider pl-16 text-sm">
              <Checkbox checked={s.done} onCheckedChange={() => toggleSub(t.id, s.id)} aria-label="Complete subtask" />
              <span className={cn(s.done && 'text-muted-foreground line-through')}>{s.title}</span>
            </label>
          ))}
        </div>
      )}
    </>
  );
}

const addRow = 'flex h-8.5 w-full items-center gap-2 border-b border-divider pr-2.5 pl-6.5 text-left text-sm text-muted-foreground';

function Composer() {
  return (
    <div className={cn(addRow, 'bg-muted text-foreground')}>
      <Plus className="size-3.5 text-muted-foreground" />
      <input
        className="h-full w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
        id="composer-in"
        placeholder="Task name — press Enter to add, Esc to cancel"
        aria-label="New task name"
        autoFocus
        onKeyDown={e => {
          if (e.key !== 'Enter' || e.shiftKey) return;
          e.preventDefault();
          commitComposer(e.currentTarget.value);
          e.currentTarget.value = '';
        }}
      />
    </div>
  );
}

/** `viewKey` names the view whose sort the header shows and where new tasks land. */
export function TaskList({
  groups,
  viewKey,
  cols = ['status', 'assignee', 'priority', 'due', 'labels'],
  complete = false,
  drag = true,
  keepEmpty = false,
  noAdd = false,
  empty,
  project,
}: {
  groups: readonly TaskGroup[];
  viewKey: ViewKey;
  cols?: readonly ListCol[];
  /** Round "complete" checkboxes instead of selection (My Tasks). */
  complete?: boolean;
  drag?: boolean;
  keepEmpty?: boolean;
  noAdd?: boolean;
  /** Replaces the default empty state. */
  empty?: ReactNode;
  /** The project a "New task" from the empty state goes to. */
  project?: Task['project'];
}) {
  const v = useStore(s => s.views[viewKey]);
  const selIds = useStore(s => s.ui.sel);
  const collapsedGroups = useStore(s => s.ui.collapsedGroups);
  const composer = useStore(s => s.ui.composer);
  const tpl = `18px 30px minmax(220px,1fr) ${cols.map(c => LCOLS[c][1]).join(' ')} 40px`;
  const all = groups.flatMap(g => g.tasks.map(t => t.id));
  const nSel = all.filter(id => selIds.includes(id)).length;
  if (!all.length && !keepEmpty)
    return (
      empty ?? (
        <Empty icon={ListChecks} title="No tasks here" text="Add a task to get things moving.">
          <Button size="sm" onClick={() => newTask(project ? { project } : {})}>
            <Plus />
            New task
          </Button>
        </Empty>
      )
    );
  const sortIcon = (f: string) => v?.sort.f === f && (v.sort.dir > 0 ? <ArrowUp className="size-2.75" /> : <ArrowDown className="size-2.75" />);
  const head = 'flex items-center gap-1 px-2 whitespace-nowrap';
  const sortBtn = cn(head, 'h-full text-left transition-colors hover:text-foreground');
  return (
    <>
      <div role="table" aria-label="Tasks">
        <div
          className="sticky top-0 z-2 grid min-h-8 grid-cols-(--cols) items-center border-b bg-background text-xs font-medium text-muted-foreground max-sm:hidden"
          style={{ '--cols': tpl }}
          role="row"
        >
          <div />
          <div className={head}>
            {!complete && (
              <Checkbox
                checked={!!nSel && nSel === all.length}
                indeterminate={!!nSel && nSel < all.length}
                onCheckedChange={() => selAll(all)}
                aria-label="Select all"
              />
            )}
          </div>
          <button className={sortBtn} onClick={() => sortBy(viewKey, 'title')}>
            Task {sortIcon('title')}
          </button>
          {cols.map(c => (
            <button key={c} className={sortBtn} onClick={() => sortBy(viewKey, c === 'labels' ? 'manual' : c)}>
              {`${LCOLS[c][0]} `}
              {sortIcon(c)}
            </button>
          ))}
          <div />
        </div>
        {groups.map(g => {
          const gk = viewKey + ':' + g.key;
          const coll = collapsedGroups[gk] ?? g.collapsed ?? false;
          const comp = composer?.ctx === viewKey && composer.group === g.key;
          return (
            <Fragment key={g.key}>
              {(groups.length > 1 || g.key !== 'all') && (
                <div
                  className="group/grp mt-2.5 flex h-9 items-center gap-2 border-b pr-2 pl-5.5 text-sm font-semibold select-none"
                  data-grp-drop={g.key}
                  data-key={viewKey}
                >
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="opacity-60 group-hover/grp:opacity-100"
                    onClick={() => toggleGroup(gk, !coll)}
                    aria-expanded={!coll}
                    aria-label="Toggle group"
                  >
                    {coll ? <ChevronRight /> : <ChevronDown />}
                  </Button>
                  {g.icon}
                  <span>{g.name}</span>
                  <span className="font-medium text-muted-foreground">{g.tasks.length}</span>
                  {!noAdd && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="opacity-60 group-hover/grp:opacity-100"
                      onClick={() => startComposer(viewKey, g.key, g.set ?? {})}
                      aria-label={`Add task to ${g.name}`}
                    >
                      <Plus />
                    </Button>
                  )}
                </div>
              )}
              {!coll && g.tasks.map(t => <TaskRow key={t.id} t={t} cols={cols} tpl={tpl} group={g.key} drag={drag} complete={complete} viewKey={viewKey} />)}
              {!coll &&
                !noAdd &&
                (comp ? (
                  <Composer />
                ) : (
                  <button
                    className={cn(addRow, 'transition-colors hover:bg-muted hover:text-foreground')}
                    onClick={() => startComposer(viewKey, g.key, g.set ?? {})}
                  >
                    <Plus className="size-3.5" />
                    Add task
                  </button>
                ))}
            </Fragment>
          );
        })}
      </div>
      <BulkBar ids={all} />
    </>
  );
}

const onInverse = 'text-background/85 hover:bg-background/14 hover:text-background aria-expanded:bg-background/14 aria-expanded:text-background';

/** Shown under a list while any of its rows are selected. */
export function BulkBar({ ids }: { ids: readonly Task['id'][] }) {
  const n = useStore(s => ids.filter(id => s.ui.sel.includes(id)).length);
  if (!n) return null;
  const sep = <span className="mx-1 h-4.5 w-px bg-background/20" />;
  return (
    <div
      className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-xl bg-foreground py-1.5 pr-1.5 pl-3.5 text-sm text-background shadow-md animate-in fade-in slide-in-from-bottom-2 duration-200"
      role="toolbar"
      aria-label="Bulk actions"
    >
      <b className="font-semibold">{`${n} selected`}</b>
      {sep}
      <MenuPicker value={null} onChange={status => bulkSet({ status })} options={STATUS_OPTIONS}>
        <Button variant="ghost" size="sm" className={onInverse}>
          <CircleDot />
          Status
        </Button>
      </MenuPicker>
      <AssigneePicker value={null} onChange={assignee => bulkSet({ assignee })}>
        <Button variant="ghost" size="sm" className={onInverse}>
          <User />
          Assignee
        </Button>
      </AssigneePicker>
      <MenuPicker value={null} onChange={priority => bulkSet({ priority })} options={PRIORITY_OPTIONS}>
        <Button variant="ghost" size="sm" className={onInverse}>
          <SignalHigh />
          Priority
        </Button>
      </MenuPicker>
      <Button variant="ghost" size="sm" className={onInverse} onClick={() => void bulkDelete()}>
        <Trash />
        Delete
      </Button>
      {sep}
      <Button variant="ghost" size="icon-sm" className={onInverse} onClick={clearSel} aria-label="Clear selection">
        <X />
      </Button>
    </div>
  );
}

const objLink = 'font-medium hover:underline hover:underline-offset-3';

/** One activity line; `proj` adds "in <project>" for task events. */
export function ActivityItem({ a, proj = false }: { a: Activity; proj?: boolean }) {
  const d = useStore(s => s.data);
  const m = memberById(d, a.by);
  const t = taskById(d, a.task);
  const p = projectById(d, a.project);
  // Links, not buttons, so a long name wraps inline with the sentence. A task has no page of its own, so its link opens the project in a
  // new tab and the drawer on a plain click.
  const obj = t ? (
    <a className={objLink} {...linkTo({ r: 'project', id: t.project }, () => openTask(t.id))}>
      {t.title}
    </a>
  ) : p ? (
    <a className={objLink} {...linkTo({ r: 'project', id: p.id })}>
      {p.name}
    </a>
  ) : null;
  return (
    <div className="relative flex gap-2.5 py-2.25 text-sm">
      <Avatar id={a.by} size="sm" className="mt-px" />
      <div className="min-w-0 flex-1">
        <b className="font-medium">{m?.id === d.me ? 'You' : m?.name || 'Someone'}</b> <span className="text-fg-2">{a.verb}</span> {obj}{' '}
        {a.extra ? <span className="text-fg-2">{a.extra}</span> : null}
        {proj && p && t && (
          <>
            {' '}
            <span className="text-muted-foreground">{`in ${p.name}`}</span>
          </>
        )}
      </div>
      <time className="text-xs whitespace-nowrap text-muted-foreground">{ago(a.at)}</time>
    </div>
  );
}

/** The compact task row on dashboards and profiles. The whole row opens the task. */
export function MiniRow({ t, noProj = false, av = true }: { t: Task; noProj?: boolean; av?: boolean }) {
  const fx = useStore(s => s.ui.fx);
  const p = useStore(s => projectById(s.data, t.project));
  const done = t.status === 'done';
  return (
    <TaskContextMenu id={t.id}>
      <div className={cn('relative flex min-h-9.5 items-center gap-2.5 border-t border-divider px-3.5 transition-colors hover:bg-muted', fxEnter(fx, t.id))}>
        <Checkbox className="relative z-10 rounded-full" checked={done} onCheckedChange={() => toggleDone(t.id)} aria-label={`Complete ${t.title}`} />
        <Tip label={ST[t.status].name}>
          <span className="relative z-10">
            <StatusIcon st={t.status} />
          </span>
        </Tip>
        <button
          className={cn(
            'min-w-0 flex-1 truncate text-left outline-none after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring',
            done && 'text-muted-foreground line-through',
          )}
          onClick={() => openTask(t.id)}
        >
          {t.title}
        </button>
        {!noProj && (
          <span className="inline-flex max-w-35 items-center gap-1.25 text-xs text-fg-2 max-sm:hidden">
            <Dot c={pColor(p)} />
            <span className="truncate">{p?.name}</span>
          </span>
        )}
        <Tip label={`${PR[t.priority].name} priority`}>
          <span className="relative z-10">
            <PriorityIcon p={t.priority} />
          </span>
        </Tip>
        <span className="w-18.5 text-right max-sm:hidden">
          <Due t={t} icon={false} />
        </span>
        {av && <Avatar id={t.assignee} size="sm" className="relative z-10" />}
      </div>
    </TaskContextMenu>
  );
}
