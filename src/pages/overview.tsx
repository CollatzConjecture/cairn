import { ChartGantt, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { STATUSES } from '../domain/constants';
import { TODAY, diffD, fmtDate, parse, relDate } from '../domain/date';
import { linkTo } from '../shell/shell';
import { allTasks, canSee, go, isOver, memberById, newProject, pColor, progressOf, tasksOf, useStore, visibleProjects } from '../store';
import { Avatar, ProgressBar, ProjectIcon, ProjectStatusBadge, StatusIcon } from '../ui/helpers';
import { Grid2, Page, PageHeader, Panel, PanelHeader, Stack, Stat, Stats, barTone, stretched, tc } from './kit';

const pct = (n: number, of: number) => Math.round((n / Math.max(of, 1)) * 100);

export function OverviewPage() {
  const d = useStore(s => s.data);
  const ps = visibleProjects(d).filter(p => canSee(d, p));
  const all = allTasks(d);
  const done = all.filter(t => t.status === 'done').length;
  const counts = STATUSES.map(s => ({ s, n: all.filter(t => t.status === s.id).length }));
  const ms = ps
    .flatMap(p => p.milestones.map(m => ({ ...m, p })))
    .filter(m => diffD(parse(m.date), TODAY) >= 0)
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .slice(0, 6);
  const load = d.members
    .filter(m => m.status === 'active')
    .map(m => ({ m, ts: all.filter(t => t.assignee === m.id && t.status !== 'done') }))
    .sort((a, b) => b.ts.length - a.ts.length);
  const maxL = Math.max(...load.map(l => l.ts.length), 1);
  return (
    <Page>
      <PageHeader title="Workspace overview" sub={`Health of every project in ${d.ws.name}.`}>
        <Button variant="outline" nativeButton={false} render={<a {...linkTo({ r: 'timeline' })} />}>
          <ChartGantt />
          Timeline
        </Button>
        <Button onClick={newProject}>
          <Plus />
          New project
        </Button>
      </PageHeader>
      <Stats className="mb-4">
        <Stat k="Projects" v={ps.length} d={`${ps.filter(p => p.status === 'complete').length} completed`} />
        <Stat k="Tasks" v={all.length} d={`${all.length - done} open`} />
        <Stat k="Completion rate" v={`${pct(done, all.length)}%`} d="across all projects" />
        <Stat k="Members" v={d.members.length} d={`${d.members.filter(m => m.status === 'invited').length} pending invite`} />
      </Stats>
      <Grid2>
        <Panel>
          <PanelHeader title="Portfolio" />
          <Table className={cn(tc.table, 'min-w-150')}>
            <TableHeader>
              <TableRow className={tc.row}>
                <TableHead className={tc.head}>Project</TableHead>
                <TableHead className={tc.head}>Lead</TableHead>
                <TableHead className={tc.head}>Status</TableHead>
                <TableHead className={cn(tc.head, 'w-[22%]')}>Progress</TableHead>
                <TableHead className={cn(tc.head, 'text-center')}>Open</TableHead>
                <TableHead className={cn(tc.head, 'text-center')}>Overdue</TableHead>
                <TableHead className={tc.head}>Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ps.map(p => {
                const ts = tasksOf(d, p.id);
                const pr = progressOf(d, p.id);
                const ov = ts.filter(isOver).length;
                return (
                  <TableRow key={p.id} className={tc.link}>
                    <TableCell className={tc.cell}>
                      <span className="flex min-w-0 items-center gap-2">
                        <ProjectIcon p={p} />
                        <button className={cn(stretched, 'truncate font-medium')} onClick={() => go({ r: 'project', id: p.id, tab: 'overview' })}>
                          {p.name}
                        </button>
                      </span>
                    </TableCell>
                    <TableCell className={tc.cell}>
                      <span className="flex items-center gap-2">
                        <Avatar id={p.lead} size="sm" className="relative z-10" />
                        <span className="truncate text-fg-2">{memberById(d, p.lead)?.name.split(' ')[0]}</span>
                      </span>
                    </TableCell>
                    <TableCell className={tc.cell}>
                      <ProjectStatusBadge s={p.status} />
                    </TableCell>
                    <TableCell className={tc.cell}>
                      <span className="flex items-center gap-2">
                        <ProgressBar v={pr} className={p.status === 'complete' ? barTone.green : p.status === 'risk' ? barTone.red : undefined} />
                        <span className="w-7.5 text-xs text-muted-foreground tabular-nums">{`${pr}%`}</span>
                      </span>
                    </TableCell>
                    <TableCell className={cn(tc.cell, 'text-center tabular-nums')}>{ts.filter(t => t.status !== 'done').length}</TableCell>
                    <TableCell className={cn(tc.cell, 'text-center tabular-nums', ov ? 'text-red' : 'text-muted-foreground')}>{ov}</TableCell>
                    <TableCell className={cn(tc.cell, 'text-fg-2 tabular-nums')}>{fmtDate(p.due)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Panel>
        <Stack>
          <Panel>
            <PanelHeader title="Tasks by status" />
            <div className="px-3.5 pb-3.5">
              <div className="mb-3 flex h-2.5 overflow-hidden rounded-full bg-muted-strong" role="img" aria-label="Tasks by status">
                {counts.map(c => (
                  <i
                    key={c.s.id}
                    className="block h-full bg-(--c)"
                    style={{ width: `${pct(c.n, all.length)}%`, '--c': `var(--st-${c.s.id})` }}
                    title={`${c.s.name}: ${c.n}`}
                  />
                ))}
              </div>
              {counts.map(c => (
                <div key={c.s.id} className="flex h-7 items-center gap-2 text-base">
                  <StatusIcon st={c.s.id} />
                  <span className="flex-1">{c.s.name}</span>
                  <span className="text-fg-2 tabular-nums">{c.n}</span>
                  <span className="w-9 text-right text-muted-foreground tabular-nums">{`${pct(c.n, all.length)}%`}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <PanelHeader title="Workload">
              <span className="text-xs text-muted-foreground">Open tasks per person</span>
            </PanelHeader>
            <div className="px-3.5 pb-3.5">
              {load.map(l => (
                <div key={l.m.id} className="relative -mx-1.5 flex h-7.5 items-center gap-2 rounded-md px-1.5 text-base transition-colors hover:bg-muted">
                  <Avatar id={l.m.id} size="sm" tip={false} />
                  <a {...linkTo({ r: 'member', id: l.m.id })} className={cn(stretched, 'w-24 truncate')}>
                    {l.m.name.split(' ')[0]}
                  </a>
                  <span className="flex h-2 flex-1 overflow-hidden rounded-sm bg-muted-strong">
                    <span className="flex" style={{ width: `${(l.ts.length / maxL) * 100}%` }}>
                      {STATUSES.filter(s => s.id !== 'done').map(s => {
                        const n = l.ts.filter(t => t.status === s.id).length;
                        return n ? <i key={s.id} className="block bg-(--c)" style={{ flex: n, '--c': `var(--st-${s.id})` }} /> : null;
                      })}
                    </span>
                  </span>
                  <span className="w-5.5 text-right text-fg-2 tabular-nums">{l.ts.length}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <PanelHeader title="Upcoming milestones" />
            <div className="px-3.5 pb-3.5">
              {ms.length ? (
                ms.map(m => (
                  <div
                    key={m.p.id + m.name}
                    className="relative -mx-1.5 flex h-8 items-center gap-2 rounded-md px-1.5 text-base transition-colors hover:bg-muted"
                  >
                    <span className="mx-0.75 size-2.25 shrink-0 rotate-45 rounded-xs bg-(--c)" style={{ '--c': pColor(m.p) }} />
                    <button className={cn(stretched, 'min-w-0 flex-1 truncate')} onClick={() => go({ r: 'project', id: m.p.id, tab: 'timeline' })}>
                      {m.name} <span className="text-muted-foreground">{`· ${m.p.name}`}</span>
                    </button>
                    <span className="text-fg-2 tabular-nums">{relDate(m.date)}</span>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground">No upcoming milestones</div>
              )}
            </div>
          </Panel>
        </Stack>
      </Grid2>
    </Page>
  );
}
