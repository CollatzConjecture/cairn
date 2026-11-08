import { ArrowRight, ArrowUpRight, Calendar, CircleCheck, CircleDashed, ClockAlert, FolderKanban, FolderPlus, ListChecks, Plus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ActivityItem, MiniRow } from '../components/task-list';
import { DAY, MONL, TODAY, WDL, diffD, fmtDate, parse } from '../domain/date';
import type { Project, Task } from '../domain/schema';
import { linkTo } from '../shell/shell';
import {
  allTasks,
  canSee,
  go,
  goTasks,
  invite,
  isOver,
  newProject,
  newTask,
  openTask,
  pColor,
  progressOf,
  projectById,
  setUi,
  sortTasks,
  useStore,
  visibleProjects,
  type Ui,
} from '../store';
import { Avatar, AvatarStack, Dot, Empty, PriorityIcon, ProgressBar, ProjectIcon, ProjectStatusBadge } from '../ui/helpers';
import { Feed, Grid2, Page, PageHeader, Panel, PanelHeader, Seg, Stack, Stat, Stats, barTone, stretched, tc } from './kit';

type HomeTab = Ui['homeTab'];
const doneThisWeek = (t: Task) => t.status === 'done' && !!t.completedAt && Date.now() - t.completedAt < 7 * DAY;
const TAB_NAMES: Record<HomeTab, string> = { upcoming: 'Upcoming', overdue: 'Overdue', completed: 'Completed' };

function MyTasks() {
  const d = useStore(s => s.data);
  const tab = useStore(s => s.ui.homeTab);
  const mine = allTasks(d).filter(t => t.assignee === d.me);
  const lists: Record<HomeTab, Task[]> = {
    upcoming: sortTasks(
      d,
      mine.filter(t => t.status !== 'done' && !isOver(t)),
      { f: 'due', dir: 1 },
    ),
    overdue: mine.filter(isOver),
    completed: sortTasks(
      d,
      mine.filter(t => t.status === 'done'),
      { f: 'updated', dir: 1 },
    ),
  };
  const cur = lists[tab];
  return (
    <Panel label="My tasks">
      <PanelHeader title="My tasks">
        <Seg
          label="My tasks"
          value={tab}
          onChange={v => setUi('homeTab', v)}
          items={(['upcoming', 'overdue', 'completed'] as const).map(k => ({ value: k, label: TAB_NAMES[k], count: lists[k].length }))}
        />
        <Button variant="ghost" size="icon-sm" aria-label="Open My Tasks" nativeButton={false} render={<a {...linkTo({ r: 'mytasks' })} />}>
          <ArrowUpRight />
        </Button>
      </PanelHeader>
      <div>
        {cur.length ? (
          cur.slice(0, 7).map(t => <MiniRow key={t.id} t={t} av={false} />)
        ) : tab === 'overdue' ? (
          <Empty icon={CircleCheck} title="Nothing overdue" text="Every task assigned to you is on schedule." level={3} className="py-8" />
        ) : (
          <Empty icon={ListChecks} title="No tasks here" text="Add a task to get things moving." level={3} className="py-8" />
        )}
      </div>
      {cur.length > 7 && (
        <a
          {...linkTo({ r: 'mytasks' })}
          className="flex h-8.5 items-center gap-2 border-t border-divider px-3.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {`View all ${cur.length} tasks`}
          <ArrowRight className="size-3.25" />
        </a>
      )}
    </Panel>
  );
}

function ProjectProgress({ ps }: { ps: readonly Project[] }) {
  const d = useStore(s => s.data);
  return (
    <Panel>
      <PanelHeader title="Project progress">
        <Button variant="ghost" size="sm" nativeButton={false} render={<a {...linkTo({ r: 'projects' })} />}>
          All projects
        </Button>
      </PanelHeader>
      <Table className={cn(tc.table, 'min-w-140')}>
        <TableHeader>
          <TableRow className={tc.row}>
            <TableHead className={tc.head}>Project</TableHead>
            <TableHead className={tc.head}>Status</TableHead>
            <TableHead className={cn(tc.head, 'w-[26%]')}>Progress</TableHead>
            <TableHead className={tc.head}>Due</TableHead>
            <TableHead className={cn(tc.head, 'text-right')}>Team</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ps.map(p => {
            const pr = progressOf(d, p.id);
            return (
              <TableRow key={p.id} className={tc.link}>
                <TableCell className={tc.cell}>
                  <span className="flex items-center gap-2">
                    <ProjectIcon p={p} />
                    <button className={cn(stretched, 'font-medium')} onClick={() => go({ r: 'project', id: p.id, tab: 'overview' })}>
                      {p.name}
                    </button>
                  </span>
                </TableCell>
                <TableCell className={tc.cell}>
                  <ProjectStatusBadge s={p.status} />
                </TableCell>
                <TableCell className={tc.cell}>
                  <span className="flex items-center gap-2">
                    <ProgressBar v={pr} className={p.status === 'risk' ? barTone.red : undefined} />
                    <span className="w-7.5 text-[11.5px] text-muted-foreground tabular-nums">{`${pr}%`}</span>
                  </span>
                </TableCell>
                <TableCell className={cn(tc.cell, 'text-fg-2 tabular-nums')}>{fmtDate(p.due)}</TableCell>
                <TableCell className={cn(tc.cell, 'text-right')}>
                  <span className="relative z-10">
                    <AvatarStack ids={p.members} max={3} />
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Panel>
  );
}

function Deadlines({ open }: { open: readonly Task[] }) {
  const d = useStore(s => s.data);
  const within = (a: number, b: number) =>
    sortTasks(
      d,
      open.filter(t => t.due && diffD(parse(t.due), TODAY) >= a && diffD(parse(t.due), TODAY) <= b),
      { f: 'priority', dir: 1 },
    );
  const groups = [
    ['Today', within(0, 0)],
    ['Tomorrow', within(1, 1)],
    ['This week', within(2, 7)],
  ] as const;
  return (
    <Panel>
      <PanelHeader title="Upcoming deadlines">
        <Button variant="ghost" size="sm" nativeButton={false} render={<a {...linkTo({ r: 'calendar' })} />}>
          <Calendar />
          Calendar
        </Button>
      </PanelHeader>
      <div className="px-3.5 pb-1.5">
        {groups.map(([lab, ts]) => (
          <div key={lab} className="mb-2.5">
            <h3 className="mb-1 flex items-center gap-2 text-[11.5px] font-semibold text-fg-2">
              {lab}
              <span className="font-medium text-muted-foreground">{ts.length}</span>
            </h3>
            {ts.length ? (
              <>
                {ts.slice(0, 4).map(t => (
                  <div key={t.id} className="relative -mx-1.5 flex h-7.5 items-center gap-2 rounded-md px-1.5 transition-colors hover:bg-muted">
                    <Dot c={pColor(projectById(d, t.project))} />
                    <button className={cn(stretched, 'min-w-0 flex-1 truncate')} onClick={() => openTask(t.id)}>
                      {t.title}
                    </button>
                    <PriorityIcon p={t.priority} className="size-3.25" />
                    <Avatar id={t.assignee} size="sm" className="relative z-10" />
                  </div>
                ))}
                {ts.length > 4 && <div className="pl-4 text-[11.5px] text-muted-foreground">{`+${ts.length - 4} more`}</div>}
              </>
            ) : (
              <div className="pt-1 pb-0.5 text-sm text-muted-foreground">Nothing due</div>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function HomePage() {
  const d = useStore(s => s.data);
  const name = useStore(s => s.prefs.name);
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const all = allTasks(d);
  const activeP = visibleProjects(d).filter(p => canSee(d, p) && p.status !== 'complete');
  const open = all.filter(t => t.status !== 'done');
  const doneWk = all.filter(doneThisWeek);
  const over = all.filter(isOver);
  return (
    <Page>
      <PageHeader
        title={`${greet}, ${name.split(' ')[0]}`}
        sub={
          <>
            <span className="tabular-nums">{`${WDL[TODAY.getDay()]}, ${MONL[TODAY.getMonth()]} ${TODAY.getDate()}`}</span>
            {" · Here's what's happening across your workspace."}
          </>
        }
      >
        <Button variant="outline" className="max-sm:hidden" onClick={invite}>
          <UserPlus />
          Invite member
        </Button>
        <Button variant="outline" className="max-sm:hidden" onClick={newProject}>
          <FolderPlus />
          New project
        </Button>
        <Button onClick={() => newTask()}>
          <Plus />
          New task
        </Button>
      </PageHeader>
      <Stats className="mb-4">
        <Stat
          icon={<FolderKanban />}
          k="Active projects"
          v={activeP.length}
          d={`${activeP.filter(p => p.status === 'risk').length} at risk`}
          onClick={() => go({ r: 'projects' })}
        />
        <Stat
          icon={<CircleDashed />}
          k="Open tasks"
          v={open.length}
          d={`${open.filter(t => t.assignee === d.me).length} assigned to you`}
          onClick={() => goTasks('open')}
        />
        <Stat icon={<CircleCheck />} k="Completed" v={doneWk.length} d="this week" tone="up" onClick={() => goTasks('done')} />
        <Stat
          icon={<ClockAlert />}
          k="Overdue"
          v={over.length}
          d={over.length ? 'need attention' : 'all on track'}
          tone={over.length ? 'bad' : undefined}
          onClick={() => goTasks('overdue')}
        />
      </Stats>
      <Grid2>
        <Stack>
          <MyTasks />
          <ProjectProgress ps={activeP} />
        </Stack>
        <Stack>
          <Deadlines open={open} />
          <Panel>
            <PanelHeader title="Recent activity">
              <Button variant="ghost" size="sm" nativeButton={false} render={<a {...linkTo({ r: 'activity' })} />}>
                View all
              </Button>
            </PanelHeader>
            <div className="px-3.5 pb-3.5">
              <Feed>
                {d.activity.slice(0, 7).map(a => (
                  <ActivityItem key={a.id} a={a} proj />
                ))}
              </Feed>
            </div>
          </Panel>
        </Stack>
      </Grid2>
    </Page>
  );
}
