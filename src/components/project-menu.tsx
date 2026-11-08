/* The project menu, used by the sidebar, the Projects page and the project header. */
import type { ReactElement } from 'react';
import { ArrowDown, ArrowUp, ArrowUpRight, Archive, Copy, Link, Pencil, Share2, Star, Trash } from 'lucide-react';
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@/components/ui/context-menu';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { ProjectId } from '../domain/ids';
import {
  archiveProject,
  copyLink,
  delProject,
  dupProject,
  editProject,
  go,
  moveProject,
  projectById,
  share,
  toggleFavProj,
  useStore,
  visibleProjects,
} from '../store';

function ProjectMenuItems({ id }: { id: ProjectId }) {
  const d = useStore(s => s.data);
  const p = projectById(d, id);
  if (!p) return null;
  const order = visibleProjects(d);
  const i = order.indexOf(p);
  return (
    <>
      <DropdownMenuItem onClick={() => go({ r: 'project', id })}>
        <ArrowUpRight />
        Open
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => toggleFavProj(id)}>
        <Star />
        {p.fav ? 'Remove from favorites' : 'Add to favorites'}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => editProject(id)}>
        <Pencil />
        Rename & edit
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => share(id)}>
        <Share2 />
        Share
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => copyLink({ project: id })}>
        <Link />
        Copy link
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => dupProject(id)}>
        <Copy />
        Duplicate
      </DropdownMenuItem>
      {(i > 0 || i < order.length - 1) && <DropdownMenuSeparator />}
      {i > 0 && (
        <DropdownMenuItem onClick={() => moveProject(id, -1)}>
          <ArrowUp />
          Move up in sidebar
        </DropdownMenuItem>
      )}
      {i < order.length - 1 && (
        <DropdownMenuItem onClick={() => moveProject(id, 1)}>
          <ArrowDown />
          Move down in sidebar
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => void archiveProject(id)}>
        <Archive />
        {p.status === 'complete' ? 'Archive' : 'Archive project'}
      </DropdownMenuItem>
      <DropdownMenuItem variant="destructive" onClick={() => void delProject(id)}>
        <Trash />
        Delete project
      </DropdownMenuItem>
    </>
  );
}

/** The project menu behind a trigger button (`children`). */
export function ProjectMenu({ id, children, align = 'start' }: { id: ProjectId; children: ReactElement; align?: 'start' | 'end' }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={children} />
      <DropdownMenuContent align={align} className="w-auto">
        <ProjectMenuItems id={id} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The project menu on right click of `children`. */
export function ProjectContextMenu({ id, children }: { id: ProjectId; children: ReactElement }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger render={children} />
      <ContextMenuContent className="w-auto">
        <ProjectMenuItems id={id} />
      </ContextMenuContent>
    </ContextMenu>
  );
}
