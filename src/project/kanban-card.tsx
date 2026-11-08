/* A board card. The title is the stretched button that opens the task; the meta pills and the hover
   actions sit above it. Board passes `drag` to make the card sortable; elsewhere (the design system page) it renders static. */
import type { ReactNode } from 'react';
import { Check, Ellipsis, ListChecks, MessageSquare, Paperclip, Pencil, Repeat, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AssigneePicker, DatePicker, PriorityPicker } from '../components/pickers';
import { fxEnter } from '../components/task-list';
import { TaskContextMenu, TaskMenu } from '../components/task-menu';
import { PR } from '../domain/constants';
import type { Task } from '../domain/schema';
import { commentsOf, editTask, openTask, pColor, projectById, setTaskDate, toggleDone, updateTask, useStore } from '../store';
import { Avatar, Dot, Due, Label, PriorityIcon, ProgressBar, StatusIcon, Tip } from '../ui/helpers';

const meta = 'relative z-10 inline-flex items-center gap-0.75 rounded-sm transition-colors hover:text-foreground [&_svg]:size-3';

/** `handle` is the board's keyboard drag handle (first of the hover actions); `placeholder` dims the card while its ghost is dragged. */
export function KanbanCard({
  t,
  showProj = false,
  handle,
  placeholder = false,
  ghost = false,
}: {
  t: Task;
  showProj?: boolean;
  handle?: ReactNode;
  placeholder?: boolean;
  ghost?: boolean;
}) {
  const fx = useStore(s => s.ui.fx);
  const cc = useStore(s => commentsOf(s.data, t.id).length);
  const p = useStore(s => projectById(s.data, t.project));
  const done = t.status === 'done';
  const sd = t.subtasks.filter(s => s.done).length;
  const ac = t.attachments.length;
  const card = (
    <div
      className={cn(
        'group/card relative flex cursor-pointer touch-manipulation flex-col gap-2 rounded-lg bg-card px-[calc(var(--card-pad)+2px)] py-(--card-pad) shadow-card transition-shadow hover:ring-1 hover:ring-input',
        placeholder && 'opacity-35',
        ghost && 'rotate-[1.5deg] cursor-grabbing shadow-drag',
        fxEnter(fx, t.id),
        fx.done === t.id && 'animate-in zoom-in-[1.02] duration-300',
      )}
      data-drag-card={t.id}
    >
      {t.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {t.labels.map(l => (
            <Label key={l} id={l} />
          ))}
        </div>
      )}
      <div className="flex items-start">
        {done && <StatusIcon st="done" className="mt-0.5 mr-1.75 size-3.5" />}
        <button
          className={cn(
            'min-w-0 flex-1 text-left text-base leading-[1.4] font-[450] break-words outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:outline-2 focus-visible:after:outline-ring',
            done && 'text-muted-foreground line-through',
          )}
          onClick={() => openTask(t.id)}
        >
          {t.title}
        </button>
      </div>
      {t.subtasks.length > 0 && (
        <div className="flex items-center gap-2 text-2xs text-muted-foreground">
          <ListChecks className="size-3" />
          <span className="tabular-nums">{`${sd}/${t.subtasks.length}`}</span>
          <ProgressBar
            v={Math.round((sd / t.subtasks.length) * 100)}
            className={cn(sd === t.subtasks.length && '[&_[data-slot=progress-indicator]]:bg-green')}
          />
        </div>
      )}
      <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
        {showProj && p && (
          <Tip label={p.name}>
            <span className={meta}>
              <Dot c={pColor(p)} />
            </span>
          </Tip>
        )}
        <span className="font-mono text-2xs">{t.key}</span>
        <PriorityPicker value={t.priority} onChange={priority => updateTask(t.id, { priority })}>
          <button className={meta} aria-label={`Priority: ${PR[t.priority].name}`}>
            <PriorityIcon p={t.priority} />
          </button>
        </PriorityPicker>
        {t.due && (
          <DatePicker value={t.due} onChange={v => setTaskDate(t.id, 'due', v)}>
            <button className={meta} aria-label="Due date">
              <Due t={t} />
            </button>
          </DatePicker>
        )}
        {t.recur && (
          <Tip label={`Repeats ${t.recur.toLowerCase()}`}>
            <span className={meta}>
              <Repeat />
            </span>
          </Tip>
        )}
        {cc > 0 && (
          <span className={meta} aria-label={`${cc} comments`}>
            <MessageSquare />
            {cc}
          </span>
        )}
        {ac > 0 && (
          <span className={meta} aria-label={`${ac} attachments`}>
            <Paperclip />
            {ac}
          </span>
        )}
        <AssigneePicker value={t.assignee} onChange={assignee => updateTask(t.id, { assignee })}>
          <button className={cn(meta, 'ml-auto rounded-full')} aria-label="Assignee">
            <Avatar id={t.assignee} size="sm" tip={false} />
          </button>
        </AssigneePicker>
      </div>
      {!ghost && (
        <div className="absolute top-1.5 right-1.5 z-10 hidden gap-px rounded-md bg-card p-px ring-1 ring-border group-focus-within/card:flex group-hover/card:flex">
          {handle}
          <Tip label={done ? 'Reopen' : 'Mark complete'}>
            <Button variant="ghost" size="icon-xs" onClick={() => toggleDone(t.id)} aria-label={done ? 'Reopen' : 'Mark complete'}>
              {done ? <RotateCcw /> : <Check />}
            </Button>
          </Tip>
          <Tip label="Quick edit">
            <Button variant="ghost" size="icon-xs" onClick={() => editTask(t.id)} aria-label="Quick edit">
              <Pencil className="size-3" />
            </Button>
          </Tip>
          <TaskMenu id={t.id}>
            <Button variant="ghost" size="icon-xs" aria-label="More actions">
              <Ellipsis />
            </Button>
          </TaskMenu>
        </div>
      )}
    </div>
  );
  return ghost ? card : <TaskContextMenu id={t.id}>{card}</TaskContextMenu>;
}
