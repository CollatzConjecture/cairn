import { Calendar, CircleCheck, Clock, Ellipsis, FolderKanban, LayoutGrid, List, Lock, Plus, SearchX, Star, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ProjectContextMenu, ProjectMenu } from '../components/project-menu';
import { PSTAT } from '../domain/constants';
import { ago, fmtDate, minsAgo } from '../domain/date';
import type { Project } from '../domain/schema';
import { linkTo } from '../shell/shell';
import { canSee, memberById, newProject, progressOf, set, setUi, tasksOf, teamOrNone, useStore, visibleProjects, type Ui } from '../store';
import { Avatar, AvatarStack, Empty, ProgressBar, ProjectIcon, ProjectStatusBadge, Tip } from '../ui/helpers';
import { Page, PageHeader, Panel, SearchField, Seg, SelectField, barTone, stretched, tc } from './kit';

const tone = (p: Project) => (p.status === 'complete' ? barTone.green : p.status === 'risk' ? barTone.red : undefined);
const moreBtn = 'relative z-10';

/** The whole card opens the project; "…" and right click open the project menu. Favorites uses it too. */
export function ProjectCard({ p }: { p: Project }) {
  const d = useStore(s => s.data);
  const ts = tasksOf(d, p.id);
  const pr = progressOf(d, p.id);
  const open = ts.filter(t => t.status !== 'done').length;
  const locked = !canSee(d, p);
  return (
    <ProjectContextMenu id={p.id}>
      <div className="group/card relative flex flex-col gap-3 rounded-xl border bg-card p-3.5 transition-[border-color,box-shadow] hover:border-input hover:shadow-md">
        <div className="flex items-center gap-2">
          <ProjectIcon p={p} />
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <a {...linkTo({ r: 'project', id: p.id })} className={cn(stretched, 'truncate text-[14px] font-semibold')}>
              {p.name}
            </a>
            {p.fav && <Star className="size-3 shrink-0 text-amber" aria-label="Favorite" />}
            {p.private && (
              <Tip label="Private project">
                <Lock className="relative z-10 size-3 shrink-0 text-muted-foreground" aria-label="Private project" />
              </Tip>
            )}
          </div>
          <ProjectStatusBadge s={p.status} />
        </div>
        <p className="line-clamp-2 min-h-[2.9em] text-sm text-fg-2">{p.desc}</p>
        {locked ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="size-3" />
            Restricted — request access to see tasks
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <ProgressBar v={pr} className={tone(p)} />
            <span className="text-xs font-medium tabular-nums">{`${pr}%`}</span>
          </div>
        )}
        <div className="flex items-center gap-2.5 border-t border-divider pt-2.5 text-xs text-muted-foreground [&_svg]:size-3">
          <span className="flex items-center gap-1">
            <CircleCheck />
            {locked ? '—' : `${ts.length - open}/${ts.length}`}
          </span>
          <span className="flex items-center gap-1 tabular-nums">
            <Calendar />
            {fmtDate(p.due)}
          </span>
          <span className="flex items-center gap-1 max-sm:hidden">
            <Clock />
            {ago(minsAgo(p.last))}
          </span>
          <span className="relative z-10 ml-auto">
            <AvatarStack ids={p.members} max={3} />
          </span>
        </div>
        <ProjectMenu id={p.id} align="end">
          <Button
            variant="outline"
            size="icon-sm"
            className="absolute top-2.5 right-2.5 z-10 opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
            aria-label="Project options"
          >
            <Ellipsis />
          </Button>
        </ProjectMenu>
      </div>
    </ProjectContextMenu>
  );
}
export const ProjectGrid = ({ ps }: { ps: readonly Project[] }) => (
  <div className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-3 max-sm:grid-cols-1">
    {ps.map(p => (
      <ProjectCard key={p.id} p={p} />
    ))}
  </div>
);

function ProjectRow({ p }: { p: Project }) {
  const d = useStore(s => s.data);
  const pr = progressOf(d, p.id);
  return (
    <ProjectContextMenu id={p.id}>
      <div className="relative flex min-h-13 items-center gap-3 px-3.5 transition-colors not-first:border-t not-first:border-divider hover:bg-muted">
        <ProjectIcon p={p} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <a {...linkTo({ r: 'project', id: p.id })} className={cn(stretched, 'font-medium')}>
              {p.name}
            </a>
            {p.private && <Lock className="size-3 text-muted-foreground" aria-label="Private project" />}
          </div>
          <div className="truncate text-xs text-muted-foreground">{p.desc}</div>
        </div>
        <span className="max-sm:hidden">
          <ProjectStatusBadge s={p.status} />
        </span>
        <span className="flex w-35 items-center gap-2 max-sm:hidden">
          <ProgressBar v={pr} />
          <span className="text-xs text-muted-foreground tabular-nums">{`${pr}%`}</span>
        </span>
        <span className="w-17.5 text-xs text-fg-2 tabular-nums max-sm:hidden">{fmtDate(p.due)}</span>
        <span className={moreBtn}>
          <AvatarStack ids={p.members} max={3} />
        </span>
        <ProjectMenu id={p.id} align="end">
          <Button variant="ghost" size="icon-sm" className={moreBtn} aria-label="Project options">
            <Ellipsis />
          </Button>
        </ProjectMenu>
      </div>
    </ProjectContextMenu>
  );
}

function ProjectTable({ ps }: { ps: readonly Project[] }) {
  const d = useStore(s => s.data);
  const heads = ['Project', 'Status', 'Lead', 'Team', 'Progress', 'Tasks', 'Start', 'Due', 'Last activity', ''];
  return (
    <Panel>
      <Table className={cn(tc.table, 'min-w-215')}>
        <TableHeader>
          <TableRow className={tc.row}>
            {heads.map((h, i) => (
              <TableHead key={i} className={cn(tc.head, h === 'Progress' && 'w-[16%]', h === 'Tasks' && 'text-center')}>
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {ps.map(p => {
            const pr = progressOf(d, p.id);
            return (
              <ProjectContextMenu key={p.id} id={p.id}>
                <TableRow className={tc.link}>
                  <TableCell className={tc.cell}>
                    <span className="flex items-center gap-2">
                      <ProjectIcon p={p} />
                      <a {...linkTo({ r: 'project', id: p.id })} className={cn(stretched, 'font-medium')}>
                        {p.name}
                      </a>
                    </span>
                  </TableCell>
                  <TableCell className={tc.cell}>
                    <ProjectStatusBadge s={p.status} />
                  </TableCell>
                  <TableCell className={tc.cell}>
                    <span className="flex items-center gap-2">
                      <Avatar id={p.lead} size="sm" className="relative z-10" />
                      {memberById(d, p.lead)?.name}
                    </span>
                  </TableCell>
                  <TableCell className={cn(tc.cell, 'text-fg-2')}>{teamOrNone(d, p.team).name}</TableCell>
                  <TableCell className={tc.cell}>
                    <span className="flex items-center gap-2">
                      <ProgressBar v={pr} />
                      <span className="text-xs text-muted-foreground tabular-nums">{`${pr}%`}</span>
                    </span>
                  </TableCell>
                  <TableCell className={cn(tc.cell, 'text-center tabular-nums')}>{tasksOf(d, p.id).length}</TableCell>
                  <TableCell className={cn(tc.cell, 'text-fg-2 tabular-nums')}>{fmtDate(p.start)}</TableCell>
                  <TableCell className={cn(tc.cell, 'text-fg-2 tabular-nums')}>{fmtDate(p.due)}</TableCell>
                  <TableCell className={cn(tc.cell, 'text-fg-2')}>{ago(minsAgo(p.last))}</TableCell>
                  <TableCell className={tc.cell}>
                    <ProjectMenu id={p.id} align="end">
                      <Button variant="ghost" size="icon-sm" className={moreBtn} aria-label="Project options">
                        <Ellipsis />
                      </Button>
                    </ProjectMenu>
                  </TableCell>
                </TableRow>
              </ProjectContextMenu>
            );
          })}
        </TableBody>
      </Table>
    </Panel>
  );
}

type Sort = Ui['projSort'];
const SORTS: Record<Sort, [string, (d: Parameters<typeof progressOf>[0], p: Project) => string | number]> = {
  recent: ['Recently active', (_, p) => p.last],
  name: ['Name', (_, p) => p.name],
  due: ['Due date', (_, p) => p.due],
  progress: ['Progress', (d, p) => -progressOf(d, p.id)],
};
const STATUS_OPTIONS = [{ value: 'all', label: 'All statuses' }, ...Object.entries(PSTAT).map(([k, v]) => ({ value: k, label: v.name }))];
const SORT_OPTIONS = (['recent', 'name', 'due', 'progress'] as const).map(k => ({ value: k, label: `Sort: ${SORTS[k][0]}` }));

const clearProjFilters = () =>
  set(s => {
    s.ui.projQ = '';
    s.ui.projStatus = 'all';
  });

export function ProjectsPage() {
  const d = useStore(s => s.data);
  const q = useStore(s => s.ui.projQ);
  const st = useStore(s => s.ui.projStatus);
  const sort = useStore(s => s.ui.projSort);
  const view = useStore(s => s.ui.projView);
  const vis = visibleProjects(d);
  const ql = q.toLowerCase();
  const key = SORTS[sort][1];
  const ps = vis
    .filter(p => (st === 'all' || p.status === st) && (!ql || p.name.toLowerCase().includes(ql) || p.desc.toLowerCase().includes(ql)))
    .sort((a, b) => (key(d, a) > key(d, b) ? 1 : -1));
  return (
    <Page className="max-w-none">
      <PageHeader
        title="Projects"
        sub={`${vis.filter(p => p.status !== 'complete').length} active · ${vis.filter(p => p.status === 'complete').length} completed`}
      >
        <Button onClick={newProject}>
          <Plus />
          New project
        </Button>
      </PageHeader>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchField
          label="Search projects"
          placeholder="Search projects"
          value={q}
          onChange={v =>
            set(s => {
              s.ui.projQ = v;
            })
          }
        />
        <SelectField
          size="sm"
          label="Filter by status"
          value={st}
          options={STATUS_OPTIONS}
          onChange={v =>
            set(s => {
              s.ui.projStatus = v;
            })
          }
        />
        <SelectField
          size="sm"
          label="Sort"
          value={sort}
          options={SORT_OPTIONS}
          onChange={v =>
            set(s => {
              s.ui.projSort = v;
            })
          }
        />
        <span className="ml-auto">
          <Seg
            label="Layout"
            value={view}
            onChange={v => setUi('projView', v)}
            items={[
              { value: 'grid', label: <span className="max-sm:hidden">Grid</span>, icon: <LayoutGrid />, aria: 'Grid' },
              { value: 'list', label: <span className="max-sm:hidden">List</span>, icon: <List />, aria: 'List' },
              { value: 'table', label: <span className="max-sm:hidden">Table</span>, icon: <Table2 />, aria: 'Table' },
            ]}
          />
        </span>
      </div>
      {!vis.length ? (
        <Panel>
          <Empty icon={FolderKanban} title="No projects yet" text="Create your first project to start organizing your work.">
            <Button size="sm" onClick={newProject}>
              <Plus />
              Create project
            </Button>
          </Empty>
        </Panel>
      ) : !ps.length ? (
        <Panel>
          <Empty icon={SearchX} title="No results found" text="No projects match your search or filters. Try a different term.">
            <Button variant="outline" size="sm" onClick={clearProjFilters}>
              Clear filters
            </Button>
          </Empty>
        </Panel>
      ) : view === 'grid' ? (
        <ProjectGrid ps={ps} />
      ) : view === 'list' ? (
        <Panel>
          {ps.map(p => (
            <ProjectRow key={p.id} p={p} />
          ))}
        </Panel>
      ) : (
        <ProjectTable ps={ps} />
      )}
    </Page>
  );
}
