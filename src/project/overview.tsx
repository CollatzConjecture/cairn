/* The project Overview and Activity tabs. */
import type { ReactNode } from 'react';
import { Activity as ActivityIcon, Calendar, CircleCheck, CircleDot, ClockAlert, Flag, Pencil, User, UserPlus, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ActivityItem, MiniRow } from '../components/task-list';
import { STATUSES, type Status } from '../domain/constants';
import { TODAY, dayBucket, diffD, fmtDate, parse } from '../domain/date';
import { activityId } from '../domain/ids';
import type { Activity, Project } from '../domain/schema';
import { linkTo } from '../shell/shell';
import { editProject, isOver, memberById, pColor, progressOf, share, sortTasks, taskById, tasksOf, teamOrNone, useStore } from '../store';
import { Avatar, AvatarStack, Empty, ProjectStatusBadge, StatusIcon } from '../ui/helpers';
import { Icon } from '../ui/icon';
import { goFilteredList, setProjectStatus } from './actions';
import { ProjectStatusPicker } from './menus';

const ST_BG: Record<Status, string> = {
  backlog: 'bg-status-backlog',
  todo: 'bg-status-todo',
  progress: 'bg-status-progress',
  review: 'bg-status-review',
  done: 'bg-status-done',
};

function Panel({ title, acts, children, body = true }: { title: string; acts?: ReactNode; children: ReactNode; body?: boolean }) {
  return (
    <section className="rounded-xl border bg-card">
      <div className="flex items-center gap-2 px-3.5 pt-3 pb-2.5 max-sm:flex-wrap">
        <h2 className="text-base font-semibold whitespace-nowrap">{title}</h2>
        {acts && <div className="ml-auto flex items-center gap-1">{acts}</div>}
      </div>
      {body ? <div className="px-3.5 pb-3.5">{children}</div> : children}
    </section>
  );
}
const linkBtn = 'h-6.5 gap-1.5 px-2 text-xs';
const kvPill = 'inline-flex h-6.5 max-w-full items-center gap-1.5 rounded-md px-1.75 text-sm';
const kvBtn = cn(kvPill, 'transition-colors hover:bg-muted aria-expanded:bg-muted');

function Kv({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <>
      <dt className="flex h-7.5 items-center gap-1.75 text-fg-2 [&_svg]:size-3.5 [&_svg]:text-fg-4">
        {icon}
        {label}
      </dt>
      <dd className="flex min-h-7.5 min-w-0 flex-wrap items-center gap-1">{children}</dd>
    </>
  );
}

export function ProjectOverview({ p }: { p: Project }) {
  const d = useStore(s => s.data);
  const ts = tasksOf(d, p.id);
  const pr = progressOf(d, p.id);
  const cnt = STATUSES.map(s => ({ s, n: ts.filter(t => t.status === s.id).length }));
  const over = ts.filter(isOver);
  const soon = sortTasks(
    d,
    ts.filter(t => t.status !== 'done' && t.due),
    { f: 'due', dir: 1 },
  ).slice(0, 6);
  const acts = d.activity.filter(a => a.project === p.id).slice(0, 6);
  const daysLeft = diffD(parse(p.due), TODAY);
  const lead = memberById(d, p.lead);
  const team = teamOrNone(d, p.team);
  return (
    <div className="mx-auto w-full max-w-290 px-(--gutter) pt-5.5 pb-18 max-md:pb-24">
      <div className="grid grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-4 max-[1100px]:grid-cols-1">
        <div className="flex flex-col gap-4">
          <Panel
            title="About"
            acts={
              <Button variant="ghost" className={linkBtn} onClick={() => editProject(p.id)}>
                <Pencil className="size-3.25" />
                Edit
              </Button>
            }
          >
            <p className="text-[14px] leading-[1.6] text-foreground">{p.desc}</p>
          </Panel>
          <Panel
            title="Progress"
            acts={<span className="text-xs text-muted-foreground">{`${ts.filter(t => t.status === 'done').length} of ${ts.length} tasks done`}</span>}
          >
            <div className="mb-2.5 flex flex-wrap items-baseline gap-2.5">
              <span className="text-[30px] font-semibold tracking-[-0.03em] tabular-nums">{`${pr}%`}</span>
              <span className="text-fg-2">{daysLeft >= 0 ? `${daysLeft} days until ${fmtDate(p.due)}` : `Ended ${fmtDate(p.due)}`}</span>
              {over.length > 0 && (
                <Badge variant="outline" className="h-5 gap-1 border-transparent bg-red/10 text-red [&>svg]:size-2.75!">
                  <ClockAlert />
                  {`${over.length} overdue`}
                </Badge>
              )}
            </div>
            <div className="mb-3 flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted-strong" role="img" aria-label="Tasks by status">
              {cnt.map(c => (
                <i
                  key={c.s.id}
                  className={cn('block h-full', ST_BG[c.s.id])}
                  style={{ width: `${(c.n / Math.max(ts.length, 1)) * 100}%` }}
                  title={`${c.s.name}: ${c.n}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-3.5 text-sm">
              {cnt.map(c => (
                <button key={c.s.id} className="inline-flex items-center gap-1.25 rounded-sm hover:underline" onClick={() => goFilteredList(p.id, c.s.id)}>
                  <StatusIcon st={c.s.id} className="size-3" />
                  <span className="text-fg-2">{c.s.name}</span>
                  <b className="font-semibold tabular-nums">{c.n}</b>
                </button>
              ))}
            </div>
          </Panel>
          <Panel
            title="Coming up"
            body={false}
            acts={
              <Button variant="ghost" className={linkBtn} nativeButton={false} render={<a {...linkTo({ r: 'project', id: p.id, tab: 'list' })} />}>
                View list
              </Button>
            }
          >
            {soon.length ? (
              <div className="pb-1">
                {soon.map(t => (
                  <MiniRow key={t.id} t={t} noProj />
                ))}
              </div>
            ) : (
              <Empty icon={CircleCheck} title="Nothing scheduled" text="Tasks with due dates will show up here." level={3} className="py-8" />
            )}
          </Panel>
        </div>
        <div className="flex flex-col gap-4">
          <Panel title="Details">
            <dl className="my-[1em] grid grid-cols-[112px_minmax(0,1fr)] items-center gap-y-0.5 text-sm max-sm:grid-cols-[96px_minmax(0,1fr)]">
              <Kv icon={<CircleDot />} label="Status">
                <ProjectStatusPicker value={p.status} onChange={v => setProjectStatus(p.id, v)}>
                  <button className={kvBtn} aria-label="Project status">
                    <ProjectStatusBadge s={p.status} />
                  </button>
                </ProjectStatusPicker>
              </Kv>
              <Kv icon={<User />} label="Lead">
                <span className={kvPill}>
                  <Avatar id={p.lead} size="sm" tip={false} />
                  <span className="truncate">{lead?.name}</span>
                </span>
              </Kv>
              <Kv icon={<Users />} label="Team">
                {team.id ? (
                  <a className={kvBtn} {...linkTo({ r: 'team', id: team.id })}>
                    <Icon name={team.icon} className="size-3.25" />
                    {team.name}
                  </a>
                ) : (
                  <span className={kvPill}>
                    <Icon name={team.icon} className="size-3.25" />
                    {team.name}
                  </span>
                )}
              </Kv>
              <Kv icon={<Calendar />} label="Start">
                <span className={cn(kvPill, 'tabular-nums')}>{fmtDate(p.start, true)}</span>
              </Kv>
              <Kv icon={<Flag />} label="Due">
                <span className={cn(kvPill, 'tabular-nums')}>{fmtDate(p.due, true)}</span>
              </Kv>
              <Kv icon={<UserPlus />} label="Members">
                <button className={kvBtn} onClick={() => share(p.id)} aria-label={`Members: ${p.members.length}`}>
                  <AvatarStack ids={p.members} max={6} />
                  <span className="text-muted-foreground">{p.members.length}</span>
                </button>
              </Kv>
            </dl>
          </Panel>
          <Panel title="Milestones">
            {p.milestones.length ? (
              p.milestones.map(m => {
                const past = diffD(parse(m.date), TODAY) < 0;
                return (
                  <div key={m.name + m.date} className="flex h-8 items-center gap-2 text-base">
                    <span className={cn('mx-0.75 size-2.25 shrink-0 rotate-45 rounded-xs', past ? 'bg-green' : 'bg-(--c)')} style={{ '--c': pColor(p) }} />
                    <span className={cn('min-w-0 flex-1 truncate', past && 'text-muted-foreground')}>{m.name}</span>
                    <span className="text-fg-2 tabular-nums">{fmtDate(m.date)}</span>
                  </div>
                );
              })
            ) : (
              <span className="text-muted-foreground">No milestones yet</span>
            )}
          </Panel>
          <Panel
            title="Recent activity"
            acts={
              <Button variant="ghost" className={linkBtn} nativeButton={false} render={<a {...linkTo({ r: 'project', id: p.id, tab: 'activity' })} />}>
                View all
              </Button>
            }
          >
            {acts.length ? acts.map(a => <ActivityItem key={a.id} a={a} />) : <span className="text-muted-foreground">No activity yet</span>}
          </Panel>
        </div>
      </div>
    </div>
  );
}

const lined =
  'relative not-last:before:absolute not-last:before:top-8 not-last:before:-bottom-1 not-last:before:left-2.5 not-last:before:w-px not-last:before:bg-border';

/** The project's activity and comments, newest first, under day headings. */
export function ProjectActivity({ p }: { p: Project }) {
  const d = useStore(s => s.data);
  const comments: Activity[] = d.comments
    .filter(c => taskById(d, c.task)?.project === p.id)
    .map(c => ({ id: activityId(c.id), by: c.by, verb: 'commented on', task: c.task, project: p.id, at: c.at, extra: '' }));
  const all = [...d.activity.filter(a => a.project === p.id), ...comments].sort((a, b) => b.at - a.at);
  const days = new Map<string, Activity[]>();
  for (const a of all) {
    const k = dayBucket(a.at);
    days.set(k, [...(days.get(k) ?? []), a]);
  }
  return (
    <div className="mx-auto w-full max-w-195 px-(--gutter) pt-4.5 pb-18 max-md:pb-24">
      {all.length ? (
        [...days].map(([k, list]) => (
          <section key={k}>
            <h2 className="pt-3.5 pb-1 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">{k}</h2>
            <div className="flex flex-col">
              {list.map(a => (
                <div key={a.id} className={lined}>
                  <ActivityItem a={a} />
                </div>
              ))}
            </div>
          </section>
        ))
      ) : (
        <Empty icon={ActivityIcon} title="No activity yet" text="Changes to this project will appear here." />
      )}
    </div>
  );
}
