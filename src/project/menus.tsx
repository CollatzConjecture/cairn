/* Menus and popovers of the project views. Each wraps its trigger (`children`) and owns its open state,
   like the shared pickers. The filter, sort, group and column menus live inside ViewToolbar (view-toolbar.tsx). */
import { useState, type ReactElement } from 'react';
import {
  Archive,
  ArrowDownWideNarrow,
  ArrowUpRight,
  Calendar,
  CheckCheck,
  Clock,
  Copy,
  Eye,
  FoldHorizontal,
  Folder,
  Link,
  Pencil,
  Plus,
  Trash,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@/components/ui/context-menu';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { MenuPicker, type PickOption } from '../components/pickers';
import { PSTAT, type ProjectStatus, type Status } from '../domain/constants';
import { fmtDate } from '../domain/date';
import type { EventId, FileId, ViewId } from '../domain/ids';
import {
  allTasks,
  applyView,
  copyLink,
  go,
  openTask,
  pColor,
  previewFile,
  projectById,
  projectFromKey,
  tasksOf,
  useStore,
  viewOf,
  type ViewKey,
} from '../store';
import { Avatar, AvatarStack, Dot, StatusIcon } from '../ui/helpers';
import { addToCol, colArchive, colDoneAll, colSortPrio, collapseCol, delFile, delView, dupFile, renameFile, renameView } from './actions';

type Trigger = { children: ReactElement };

/** Board column "…" menu: add task, collapse, mark all done or archive completed, sort by priority. */
export function ColumnMenu({ children, status, viewKey }: Trigger & { status: Status; viewKey: ViewKey }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={children} />
      <DropdownMenuContent align="end" className="w-auto">
        <DropdownMenuItem onClick={() => addToCol(viewKey, status)}>
          <Plus />
          Add task
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => collapseCol(viewKey, status)}>
          <FoldHorizontal />
          Collapse column
        </DropdownMenuItem>
        {status === 'done' ? (
          <DropdownMenuItem onClick={() => colArchive(viewKey)}>
            <Archive />
            Archive completed
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => colDoneAll(viewKey, status)}>
            <CheckCheck />
            Mark all as done
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => colSortPrio(viewKey, status)}>
          <ArrowDownWideNarrow />
          Sort by priority
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FileMenuItems({ id }: { id: FileId }) {
  return (
    <>
      <DropdownMenuItem onClick={() => previewFile(id)}>
        <Eye />
        Preview
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => void renameFile(id)}>
        <Pencil />
        Rename
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => copyLink({ file: id })}>
        <Link />
        Copy link
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => dupFile(id)}>
        <Copy />
        Duplicate
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onClick={() => void delFile(id)}>
        <Trash />
        Delete
      </DropdownMenuItem>
    </>
  );
}
/** Files tab menu: preview, rename, copy link, duplicate, delete. */
export function FileMenu({ children, id }: Trigger & { id: FileId }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={children} />
      <DropdownMenuContent align="end" className="w-auto">
        <FileMenuItems id={id} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
/** The file menu on right click of a file card or row. */
export function FileContextMenu({ children, id }: Trigger & { id: FileId }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger render={children} />
      <ContextMenuContent className="w-auto">
        <FileMenuItems id={id} />
      </ContextMenuContent>
    </ContextMenu>
  );
}

function SavedViewItems({ id }: { id: ViewId }) {
  return (
    <>
      <DropdownMenuItem onClick={() => void renameView(id)}>
        <Pencil />
        Rename view
      </DropdownMenuItem>
      <DropdownMenuItem variant="destructive" onClick={() => delView(id)}>
        <Trash />
        Delete view
      </DropdownMenuItem>
    </>
  );
}
/** Saved view tab menu on right click of the tab: rename, delete. */
export function SavedViewMenu({ children, id }: Trigger & { id: ViewId }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger render={children} />
      <ContextMenuContent className="w-auto">
        <SavedViewItems id={id} />
      </ContextMenuContent>
    </ContextMenu>
  );
}
/** The same saved view menu behind a button, so it is reachable from the keyboard. */
export function SavedViewButtonMenu({ children, id }: Trigger & { id: ViewId }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={children} />
      <DropdownMenuContent align="start" className="w-auto">
        <SavedViewItems id={id} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const PSTATS: readonly ProjectStatus[] = ['planning', 'active', 'risk', 'hold', 'complete'];
const PSTAT_OPTIONS: PickOption<ProjectStatus>[] = PSTATS.map(k => ({
  value: k,
  label: PSTAT[k].name,
  icon: <Dot c={PSTAT[k].c} round className="size-2" />,
}));
/** Project status picker in the project header and overview. */
export const ProjectStatusPicker = ({ children, value, onChange }: Trigger & { value: ProjectStatus; onChange: (v: ProjectStatus) => void }) => (
  <MenuPicker value={value} onChange={onChange} options={PSTAT_OPTIONS}>
    {children}
  </MenuPicker>
);

const listItem =
  'flex min-h-7.5 w-full items-center gap-2.25 rounded-md px-2 py-1 text-left text-base outline-none hover:bg-accent focus-visible:bg-accent [&_svg]:size-3.75 [&_svg]:shrink-0';
const popHead = 'px-2 pt-1.5 pb-1 text-2xs font-semibold tracking-[0.06em] text-muted-foreground uppercase';

/** Calendar "+N more" day list: the day's events and the tasks the view shows on it. */
export function DayListPopover({ children, date, viewKey }: Trigger & { date: string; viewKey: ViewKey | null }) {
  const [open, setOpen] = useState(false);
  const d = useStore(s => s.data);
  const views = useStore(s => s.views);
  const pid = projectFromKey(d, viewKey);
  const evs = d.events.filter(e => e.date === date && (!pid || e.project === pid));
  const base = pid ? tasksOf(d, pid) : allTasks(d);
  const ts = (viewKey ? applyView(d, base, viewOf(views, d, viewKey)) : base).filter(t => t.due === date);
  const pick = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={children} />
      <PopoverContent align="start" className="w-70 gap-0 p-1">
        <div className={popHead}>{fmtDate(date, true)}</div>
        {evs.map(e => (
          <button key={e.id} className={listItem} onClick={pick(() => go({ r: 'project', id: e.project, tab: 'calendar' }))}>
            <Clock className="text-fg-2" />
            <span className="min-w-0 flex-1 truncate">{e.title}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{e.time}</span>
          </button>
        ))}
        {ts.map(t => (
          <button key={t.id} className={listItem} onClick={pick(() => openTask(t.id))}>
            <StatusIcon st={t.status} />
            <span className="min-w-0 flex-1 truncate">{t.title}</span>
            <Avatar id={t.assignee} size="sm" tip={false} />
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

const meta = 'flex items-center gap-1.5 [&_svg]:size-3.25 [&_svg]:text-fg-4';
/** Calendar event details. */
export function EventPopover({ children, id }: Trigger & { id: EventId }) {
  const [open, setOpen] = useState(false);
  const d = useStore(s => s.data);
  const e = d.events.find(x => x.id === id);
  const p = projectById(d, e?.project);
  if (!e || !p) return children;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={children} />
      <PopoverContent align="start" className="w-67.5 gap-0 p-1">
        <div className="px-2.5 pt-2.5 pb-1.5">
          <div className="mb-1.5 flex items-center gap-2">
            <Dot c={pColor(p)} round />
            <b className="text-md font-semibold">{e.title}</b>
          </div>
          <div className="flex flex-col gap-1 text-sm text-fg-2">
            <span className={meta}>
              <Calendar />
              {`${fmtDate(e.date, true)} · ${e.time}`}
            </span>
            <span className={meta}>
              <Folder />
              {p.name}
            </span>
            <span className={meta}>
              <Users />
              <AvatarStack ids={p.members} max={5} />
            </span>
          </div>
        </div>
        <Separator className="my-1" />
        <Button
          variant="ghost"
          className="h-7.5 justify-start gap-2.25 px-2 text-base font-normal text-foreground"
          onClick={() => {
            setOpen(false);
            go({ r: 'project', id: p.id, tab: 'overview' });
          }}
        >
          <ArrowUpRight className="size-3.75 text-fg-2" />
          Open project
        </Button>
      </PopoverContent>
    </Popover>
  );
}
