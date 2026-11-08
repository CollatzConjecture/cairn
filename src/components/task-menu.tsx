/* The task menu: the same items behind a "…" button (`TaskMenu`) and on right click (`TaskContextMenu`).
   Rows, cards, calendar chips and the drawer all use these. */
import type { ComponentType, ReactElement, ReactNode } from 'react';
import { Archive, CircleCheck, CircleDot, Copy, FolderInput, Link, PanelRightOpen, Pencil, RotateCcw, SignalHigh, Star, Trash, User } from 'lucide-react';
import { ContextMenu, ContextMenuContent, ContextMenuSubContent, ContextMenuTrigger } from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TaskId } from '../domain/ids';
import { archiveTask, copyLink, delTask, dupTask, editTask, openTask, taskById, toggleDone, toggleFavTask, updateTask, useStore } from '../store';
import { PRIORITY_OPTIONS, PickerRadioItems, STATUS_OPTIONS, assigneeOptions, projectOptions } from './pickers';

type SubContent = ComponentType<{ className?: string; children: ReactNode }>;

function TaskMenuItems({ id, Sub }: { id: TaskId; Sub: SubContent }) {
  const d = useStore(s => s.data);
  const t = taskById(d, id);
  if (!t) return null;
  const done = t.status === 'done';
  return (
    <>
      <DropdownMenuItem onClick={() => openTask(id)}>
        <PanelRightOpen />
        Open
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => editTask(id)}>
        <Pencil />
        Edit
        <DropdownMenuShortcut>E</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => toggleDone(id)}>
        {done ? <RotateCcw /> : <CircleCheck />}
        {done ? 'Reopen' : 'Mark complete'}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <CircleDot />
          Status
        </DropdownMenuSubTrigger>
        <Sub className="min-w-50">
          <PickerRadioItems value={t.status} onChange={status => updateTask(id, { status })} options={STATUS_OPTIONS} />
        </Sub>
      </DropdownMenuSub>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <User />
          Assign to
        </DropdownMenuSubTrigger>
        <Sub className="min-w-50">
          <PickerRadioItems value={t.assignee ?? ''} onChange={v => updateTask(id, { assignee: v || null })} options={assigneeOptions(d)} />
        </Sub>
      </DropdownMenuSub>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <SignalHigh />
          Priority
        </DropdownMenuSubTrigger>
        <Sub className="min-w-50">
          <PickerRadioItems value={t.priority} onChange={priority => updateTask(id, { priority })} options={PRIORITY_OPTIONS} />
        </Sub>
      </DropdownMenuSub>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <FolderInput />
          Move to project
        </DropdownMenuSubTrigger>
        <Sub className="min-w-50">
          <PickerRadioItems value={t.project} onChange={project => updateTask(id, { project })} options={projectOptions(d)} />
        </Sub>
      </DropdownMenuSub>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => toggleFavTask(id)}>
        <Star />
        {t.fav ? 'Remove from favorites' : 'Add to favorites'}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => copyLink({ task: id })}>
        <Link />
        Copy link
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => dupTask(id)}>
        <Copy />
        Duplicate
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => archiveTask(id)}>
        <Archive />
        Archive
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onClick={() => void delTask(id)}>
        <Trash />
        Delete
        <DropdownMenuShortcut>Del</DropdownMenuShortcut>
      </DropdownMenuItem>
    </>
  );
}

/** The task menu behind a trigger button (`children`, usually an icon button labelled "More actions"). */
export function TaskMenu({ id, children, align = 'end' }: { id: TaskId; children: ReactElement; align?: 'start' | 'end' }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={children} />
      <DropdownMenuContent align={align} className="w-auto">
        <TaskMenuItems id={id} Sub={DropdownMenuSubContent} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const inTextField = (t: EventTarget) => t instanceof Element && !!t.closest('input,textarea,[contenteditable]');

/** The task menu on right click. `children` (a row or card element) becomes the trigger; text fields keep the browser's menu. */
export function TaskContextMenu({ id, children }: { id: TaskId; children: ReactElement }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={children}
        onContextMenu={e => {
          if (inTextField(e.target)) e.preventBaseUIHandler();
        }}
      />
      <ContextMenuContent className="w-auto">
        <TaskMenuItems id={id} Sub={ContextMenuSubContent} />
      </ContextMenuContent>
    </ContextMenu>
  );
}
