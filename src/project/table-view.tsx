/* The table view: sticky header and title column, sortable headers, resizable columns, cells that open their
   picker or edit in place. Phones get a card per task instead. */
import { useState, type ReactNode } from 'react';
import { DndContext, KeyboardSensor, MouseSensor, useDraggable, useSensor, useSensors, type DragMoveEvent } from '@dnd-kit/core';
import { ArrowDown, ArrowUp, Plus, SearchX, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { DatePicker, DepsPicker } from '../components/pickers';
import { CellAssignee, CellLabels, CellPriority, CellProject, CellStatus, pill } from '../components/task-list';
import { TaskContextMenu } from '../components/task-menu';
import { groupTasks } from '../components/view-engine';
import { TCOLS, type TableColumn } from '../domain/constants';
import { fmtDate, iso } from '../domain/date';
import type { Project, SortField, Task } from '../domain/schema';
import {
  clearFilters,
  commitCell,
  editCell,
  isOver,
  memberById,
  newTask,
  openTask,
  set,
  setTaskDate,
  sortBy,
  taskById,
  updateTask,
  updateView,
  useStore,
  useView,
  type ViewKey,
} from '../store';
import { Avatar, Due, Empty, PriorityPill, StatusIcon } from '../ui/helpers';
import { scoped } from './view-toolbar';

const MIN_W = 64;
/** Cells whose picker pill has its own padding; pulled back so its text lines up with the header. */
const PILL_COLS: readonly TableColumn[] = ['status', 'priority', 'assignee', 'due', 'start', 'labels', 'deps', 'project'];
const sortField = (c: TableColumn): SortField => (c === 'labels' || c === 'deps' ? 'manual' : c);
const cancelEdit = () =>
  set(s => {
    s.ui.editCell = null;
  });

function EditInput({ value, label, placeholder }: { value: string; label: string; placeholder?: string }) {
  return (
    <input
      id="edit-cell"
      className="h-full w-full bg-transparent text-sm outline-none"
      defaultValue={value}
      aria-label={label}
      placeholder={placeholder}
      autoFocus
      onFocus={e => e.currentTarget.select()}
      onBlur={e => commitCell(e.currentTarget.value)}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitCell(e.currentTarget.value);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          cancelEdit();
        }
      }}
    />
  );
}

const faint = <span className="text-muted-foreground">—</span>;
const cellBtn = 'flex h-full w-full min-w-0 items-center gap-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset';

function Cell({ t, c, editing }: { t: Task; c: TableColumn; editing: boolean }) {
  const d = useStore(s => s.data);
  switch (c) {
    case 'title':
      return editing ? (
        <EditInput value={t.title} label="Title" />
      ) : (
        <button className={cn(cellBtn, 'gap-2')} onClick={() => openTask(t.id)} onDoubleClick={() => editCell(t.id, 'title')} title="Double-click to rename">
          <StatusIcon st={t.status} className="size-3.25" />
          <span className="min-w-0 truncate font-[450]">{t.title}</span>
          <span className="ml-auto pl-2 font-mono text-2xs text-muted-foreground">{t.key}</span>
        </button>
      );
    case 'status':
      return <CellStatus t={t} />;
    case 'priority':
      return <CellPriority t={t} />;
    case 'assignee':
      return <CellAssignee t={t} />;
    case 'labels':
      return <CellLabels t={t} />;
    case 'project':
      return <CellProject t={t} />;
    case 'due':
    case 'start': {
      const v = t[c];
      return (
        <DatePicker value={v} onChange={x => setTaskDate(t.id, c, x)}>
          <button className={cn(pill, 'tabular-nums', c === 'due' && isOver(t) && 'text-red')} aria-label={c === 'due' ? 'Due date' : 'Start date'}>
            {v ? fmtDate(v) : faint}
          </button>
        </DatePicker>
      );
    }
    case 'deps':
      return (
        <DepsPicker task={t} onChange={deps => updateTask(t.id, { deps })}>
          <button className={cn(pill, 'gap-1 overflow-hidden')} aria-label="Dependencies">
            {t.deps.length
              ? t.deps.map(id => {
                  const x = taskById(d, id);
                  return (
                    x && (
                      <span key={id} className="rounded-sm bg-muted-strong px-1.25 py-px font-mono text-2xs text-fg-2" title={x.title}>
                        {x.key}
                      </span>
                    )
                  );
                })
              : faint}
          </button>
        </DepsPicker>
      );
    case 'estimate':
      return editing ? (
        <EditInput value={t.estimate ?? ''} label="Estimate" placeholder="e.g. 2d" />
      ) : (
        <button
          className={cn(cellBtn, 'tabular-nums')}
          onClick={() => editCell(t.id, 'estimate')}
          aria-label={`Estimate: ${t.estimate ?? 'none'}`}
          title="Click to edit"
        >
          {t.estimate ?? faint}
        </button>
      );
    case 'created':
      return <span className="text-fg-2 tabular-nums">{fmtDate(iso(new Date(t.created)))}</span>;
  }
}

function ResizeHandle({ col, name, w }: { col: TableColumn; name: string; w: number }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: col });
  return (
    <span
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${name} column`}
      aria-valuenow={w}
      aria-valuemin={MIN_W}
      aria-roledescription="column resize handle"
      className={cn(
        'absolute top-0 -right-0.75 bottom-0 z-4 w-1.5 cursor-col-resize outline-none hover:bg-primary-line focus-visible:bg-primary',
        isDragging && 'bg-primary-line',
      )}
    />
  );
}

const th = 'sticky top-0 z-3 h-8.5 border-r border-b border-r-divider bg-background px-2.5 text-xs font-medium text-fg-2 select-none';
const td = 'h-9 overflow-hidden border-r border-b border-r-divider border-b-divider bg-background px-2.5 text-sm whitespace-nowrap group-hover/tr:bg-muted';
const sticky = 'sticky left-0 pl-(--gutter)';

/** `tasks` are the view's (filtered and sorted); `project` scopes the "New task" row. */
export function TableView({ tasks, viewKey, project }: { tasks: readonly Task[]; viewKey: ViewKey; project?: Project }) {
  const d = useStore(s => s.data);
  const v = useView(viewKey);
  const edit = useStore(s => s.ui.editCell);
  const [live, setLive] = useState<{ col: TableColumn; w: number } | null>(null);
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 1 } }), useSensor(KeyboardSensor));
  const cols = TCOLS.filter(c => c[0] === 'title' || (!v.hidden.includes(c[0]) && !(c[0] === 'project' && scoped(viewKey))));
  const w = (c: (typeof TCOLS)[number]) => (live?.col === c[0] ? live.w : (v.colW[c[0]] ?? c[2]));
  const totalW = cols.reduce((a, c) => a + w(c), 0);
  const groups = groupTasks(d, tasks, v.group);
  const widthOf = (e: DragMoveEvent) => {
    const c = TCOLS.find(x => x[0] === e.active.id);
    return c && { col: c[0], w: Math.max(MIN_W, Math.round((v.colW[c[0]] ?? c[2]) + e.delta.x)) };
  };
  if (!tasks.length)
    return (
      <Empty icon={SearchX} title="No results found" text="No tasks match these filters.">
        <Button variant="secondary" size="sm" onClick={() => clearFilters(viewKey)}>
          Clear filters
        </Button>
      </Empty>
    );
  const sortIcon = (c: TableColumn) => v.sort.f === c && (v.sort.dir > 0 ? <ArrowUp className="size-2.75" /> : <ArrowDown className="size-2.75" />);
  const row = (t: Task) => (
    <TaskContextMenu key={t.id} id={t.id}>
      <TableRow className="group/tr border-0 hover:bg-transparent" data-task-row={t.id}>
        {cols.map(([c]) => {
          const editing = edit?.id === t.id && edit.f === c;
          return (
            <td
              key={c}
              className={cn(
                td,
                PILL_COLS.includes(c) && '*:-ml-1.75',
                c === 'title' && sticky,
                c === 'title' && 'z-2',
                editing && 'bg-background! ring-2 ring-ring ring-inset',
              )}
            >
              <Cell t={t} c={c} editing={editing} />
            </td>
          );
        })}
      </TableRow>
    </TaskContextMenu>
  );
  return (
    <>
      <DndContext
        sensors={sensors}
        onDragMove={e => setLive(widthOf(e) ?? null)}
        onDragEnd={e => {
          const x = widthOf(e);
          setLive(null);
          if (x)
            updateView(viewKey, view => {
              view.colW[x.col] = x.w;
            });
        }}
        onDragCancel={() => setLive(null)}
      >
        <div className="min-h-0 flex-1 overflow-auto max-sm:hidden">
          <table className="table-fixed border-separate border-spacing-0 text-sm" style={{ width: totalW, minWidth: '100%' }} aria-label="Tasks table">
            <colgroup>
              {cols.map(c => (
                <col key={c[0]} style={{ width: w(c) }} />
              ))}
            </colgroup>
            <TableHeader className="[&_tr]:border-0">
              <TableRow className="border-0 hover:bg-transparent">
                {cols.map(col => {
                  const [c, n] = col;
                  return (
                    <TableHead key={c} scope="col" aria-labelledby={`th-${viewKey}-${c}`} className={cn(th, c === 'title' && cn(sticky, 'z-5'))}>
                      <button
                        className="flex h-full w-full items-center gap-1.25 overflow-hidden text-left transition-colors hover:text-foreground"
                        id={`th-${viewKey}-${c}`}
                        onClick={() => sortBy(viewKey, sortField(c))}
                      >
                        {n}
                        {sortIcon(c)}
                      </button>
                      <ResizeHandle col={c} name={n} w={w(col)} />
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map(g => (
                <GroupRows key={g.key} show={v.group !== 'none'} span={cols.length} name={g.name} icon={g.icon} n={g.tasks.length}>
                  {g.tasks.map(row)}
                </GroupRows>
              ))}
              <tr>
                <td colSpan={cols.length} className={cn(td, sticky, 'group-hover/tr:bg-background')}>
                  <button
                    className="flex h-full w-full items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => newTask(project ? { project: project.id } : {})}
                  >
                    <Plus className="size-3.5" />
                    New task
                  </button>
                </td>
              </tr>
            </TableBody>
          </table>
        </div>
      </DndContext>
      <div className="flex flex-col gap-2 px-4 pt-2 pb-22.5 sm:hidden">
        {tasks.map(t => (
          <MobileCard key={t.id} t={t} />
        ))}
      </div>
    </>
  );
}

function GroupRows({ show, span, name, icon, n, children }: { show: boolean; span: number; name: string; icon?: ReactNode; n: number; children: ReactNode }) {
  return (
    <>
      {show && (
        <tr>
          <td colSpan={span} className="sticky left-0 h-8 border-b border-divider bg-sunken pl-(--gutter) text-xs font-semibold text-fg-2">
            <span className="flex items-center gap-1.5">
              {icon}
              {name}
              <span className="font-medium text-muted-foreground">{n}</span>
            </span>
          </td>
        </tr>
      )}
      {children}
    </>
  );
}

function MobileCard({ t }: { t: Task }) {
  const m = useStore(s => memberById(s.data, t.assignee));
  return (
    <div className="relative rounded-xl border bg-card p-3">
      <div className="mb-2 flex items-center gap-2">
        <StatusIcon st={t.status} />
        <button className="min-w-0 flex-1 text-left font-medium after:absolute after:inset-0 after:rounded-xl" onClick={() => openTask(t.id)}>
          {t.title}
        </button>
        <span className="font-mono text-2xs text-muted-foreground">{t.key}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2.5 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <PriorityPill p={t.priority} />
        </span>
        <Avatar id={t.assignee} size="sm" tip={false} />
        <span className="text-fg-2">{m?.name ?? 'Unassigned'}</span>
        <Due t={t} />
        {t.estimate && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Timer className="size-3" />
            {t.estimate}
          </span>
        )}
      </div>
    </div>
  );
}
