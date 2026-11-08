/* The project page: header, the view tabs with saved views, and the tab body. */
import { ChevronDown, Ellipsis, ListChecks, ListFilter, Plus, SearchX, Settings, Share2, Star, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ProjectMenu } from '../components/project-menu';
import { TaskList } from '../components/task-list';
import { groupTasks } from '../components/view-engine';
import { PSTAT, PTABS } from '../domain/constants';
import type { ProjectId } from '../domain/ids';
import type { Project, SavedView } from '../domain/schema';
import { Page404, StateDenied } from '../shell/errors';
import { linkTo } from '../shell/shell';
import {
  applyView,
  canSee,
  clearFilters,
  editProject,
  newTask,
  projectById,
  share,
  tasksOf,
  toggleFavProj,
  useStore,
  useView,
  type ProjectTab,
  type ViewKey,
} from '../store';
import { AvatarStack, Dot, Empty, ProjectIcon, Tip } from '../ui/helpers';
import { Icon } from '../ui/icon';
import { saveView, setProjectStatus } from './actions';
import { Board } from './board';
import { CalendarView } from './calendar-view';
import { FilesTab } from './files';
import { ProjectStatusPicker, SavedViewButtonMenu, SavedViewMenu } from './menus';
import { ProjectActivity, ProjectOverview } from './overview';
import { TableView } from './table-view';
import { TimelineControls, TimelineView } from './timeline';
import { ViewToolbar } from './view-toolbar';

const tabCls =
  'relative inline-flex h-9 shrink-0 items-center gap-1.5 px-2.5 text-sm font-medium whitespace-nowrap text-fg-2 transition-colors outline-none hover:text-foreground focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:text-foreground aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-2 aria-[current=page]:after:-bottom-px aria-[current=page]:after:h-0.5 aria-[current=page]:after:rounded-full aria-[current=page]:after:bg-foreground [&_svg]:size-3.5';

function Header({ p, tab, views }: { p: Project; tab: ProjectTab; views: readonly SavedView[] }) {
  return (
    <div className="flex shrink-0 flex-col gap-3 px-(--gutter) pt-5 max-md:pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <ProjectIcon p={p} className="size-9 rounded-[9px]" />
        <h1 className="text-xl font-semibold tracking-[-0.018em]">{p.name}</h1>
        <Tip label={p.fav ? 'Remove from favorites' : 'Add to favorites'}>
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn(p.fav && 'text-amber hover:text-amber')}
            onClick={() => toggleFavProj(p.id)}
            aria-pressed={p.fav}
            aria-label="Favorite"
          >
            <Star />
          </Button>
        </Tip>
        <ProjectStatusPicker value={p.status} onChange={v => setProjectStatus(p.id, v)}>
          <Button variant="outline" size="sm" className="h-6 gap-1.5 px-2 font-normal shadow-none" aria-label={`Project status: ${PSTAT[p.status].name}`}>
            <Dot c={PSTAT[p.status].c} round className="size-1.75" />
            {PSTAT[p.status].name}
            <ChevronDown className="size-3 text-muted-foreground" />
          </Button>
        </ProjectStatusPicker>
        <span className="flex-1" />
        <div className="flex items-center gap-1">
          <button className="flex rounded-full" onClick={() => share(p.id)} aria-label="Members">
            <AvatarStack ids={p.members} max={5} size="md" />
          </button>
          <Tip label="Add member">
            <Button variant="ghost" size="icon-sm" onClick={() => share(p.id)} aria-label="Add member">
              <UserPlus />
            </Button>
          </Tip>
          <Button variant="outline" size="sm" className="max-sm:hidden" onClick={() => share(p.id)}>
            <Share2 className="size-3.25" />
            Share
          </Button>
          <Tip label="Project settings">
            <Button variant="ghost" size="icon-sm" onClick={() => editProject(p.id)} aria-label="Project settings">
              <Settings />
            </Button>
          </Tip>
          <ProjectMenu id={p.id} align="end">
            <Button variant="ghost" size="icon-sm" aria-label="More">
              <Ellipsis />
            </Button>
          </ProjectMenu>
        </div>
      </div>
      <nav className="-mx-(--gutter) flex gap-0.5 overflow-x-auto border-b px-[calc(var(--gutter)-10px)] [scrollbar-width:none]" aria-label="Project views">
        {PTABS.map(([k, n, i]) => (
          <a key={k} className={tabCls} {...linkTo({ r: 'project', id: p.id, tab: k })} aria-current={tab === k ? 'page' : undefined}>
            <Icon name={i} />
            {n}
          </a>
        ))}
        {views.map(v => {
          const on = tab === `v:${v.id}`;
          return (
            <span key={v.id} className="inline-flex shrink-0 items-center">
              <SavedViewMenu id={v.id}>
                <a className={tabCls} {...linkTo({ r: 'project', id: p.id, tab: `v:${v.id}` })} aria-current={on ? 'page' : undefined}>
                  <ListFilter />
                  {v.name}
                </a>
              </SavedViewMenu>
              {on && (
                <SavedViewButtonMenu id={v.id}>
                  <Button variant="ghost" size="icon-xs" className="-ml-1.5 text-muted-foreground" aria-label={`${v.name} view options`}>
                    <ChevronDown />
                  </Button>
                </SavedViewButtonMenu>
              )}
            </span>
          );
        })}
        <Tip label="Save current filters as a view">
          <button className={tabCls} onClick={() => saveView(p.id)} aria-label="Save view">
            <Plus />
          </button>
        </Tip>
      </nav>
    </div>
  );
}

type ViewType = 'board' | 'list' | 'table' | 'calendar' | 'timeline';

/** The toolbar and the view for one task view of the project. */
function TaskViewBody({ type, viewKey, p }: { type: ViewType; viewKey: ViewKey; p: Project }) {
  const d = useStore(s => s.data);
  const v = useView(viewKey);
  const all = tasksOf(d, p.id);
  const ts = applyView(d, all, v);
  const addBtn = (
    <Button size="sm" onClick={() => newTask({ project: p.id })}>
      <Plus className="size-3.25" />
      New task
    </Button>
  );
  const emptyAll = (
    <Empty icon={ListChecks} title="No tasks here" text="Add a task to get things moving.">
      <Button size="sm" onClick={() => newTask({ project: p.id })}>
        <Plus />
        Add task
      </Button>
    </Empty>
  );
  const emptyFilter = (
    <Empty icon={SearchX} title="No results found" text="No tasks match these filters.">
      <Button variant="secondary" size="sm" onClick={() => clearFilters(viewKey)}>
        Clear filters
      </Button>
    </Empty>
  );
  switch (type) {
    case 'board':
      return (
        <>
          <ViewToolbar viewKey={viewKey} group={false} right={addBtn} />
          {all.length ? <Board tasks={ts} viewKey={viewKey} project={p.id} /> : emptyAll}
        </>
      );
    case 'list':
      return (
        <>
          <ViewToolbar viewKey={viewKey} right={addBtn} />
          <div className="pr-(--gutter) pb-22.5 pl-[calc(var(--gutter)-26px)] max-sm:px-(--gutter)">
            {!all.length ? emptyAll : !ts.length ? emptyFilter : <TaskList groups={groupTasks(d, ts, v.group)} viewKey={viewKey} project={p.id} />}
          </div>
        </>
      );
    case 'table':
      return (
        <>
          <ViewToolbar viewKey={viewKey} cols right={addBtn} />
          {all.length ? <TableView tasks={ts} viewKey={viewKey} project={p} /> : emptyAll}
        </>
      );
    case 'calendar':
      return (
        <>
          <ViewToolbar viewKey={viewKey} group={false} right={addBtn} />
          <CalendarView tasks={ts} viewKey={viewKey} project={p.id} events />
        </>
      );
    case 'timeline':
      return (
        <>
          <ViewToolbar viewKey={viewKey} group={false} right={addBtn} extra={<TimelineControls />} />
          <TimelineView tasks={ts} viewKey={viewKey} project={p} />
        </>
      );
  }
}

function Body({ p, tab, views }: { p: Project; tab: ProjectTab; views: readonly SavedView[] }) {
  if (tab.startsWith('v:')) {
    const sv = views.find(v => `v:${v.id}` === tab);
    return sv ? <TaskViewBody type={sv.type} viewKey={`sv:${sv.id}`} p={p} /> : <Page404 />;
  }
  switch (tab) {
    case 'overview':
      return <ProjectOverview p={p} />;
    case 'files':
      return <FilesTab pid={p.id} />;
    case 'activity':
      return <ProjectActivity p={p} />;
    case 'board':
    case 'list':
    case 'table':
    case 'calendar':
    case 'timeline':
      return <TaskViewBody key={tab} type={tab} viewKey={`p:${p.id}`} p={p} />;
    default:
      return <Page404 />;
  }
}

export function ProjectPage({ id, tab }: { id: ProjectId; tab: ProjectTab }) {
  const d = useStore(s => s.data);
  const fxTab = useStore(s => !!s.ui.fx.tab);
  const p = projectById(d, id);
  if (!p) return <Page404 />;
  if (!canSee(d, p)) return <StateDenied p={p} />;
  const views = d.savedViews.filter(v => v.project === p.id);
  return (
    <div className="flex h-full flex-col">
      <Header p={p} tab={tab} views={views} />
      <div className={cn('flex min-h-0 flex-1 flex-col', fxTab && '*:animate-in *:fade-in *:slide-in-from-bottom-2 *:duration-250')}>
        <Body p={p} tab={tab} views={views} />
      </div>
    </div>
  );
}
