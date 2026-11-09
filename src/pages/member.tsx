import { Clock, Copy, Crown, Ellipsis, ListChecks, Mail, MapPin, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ActivityItem, MiniRow } from '../components/task-list';
import { ago, minsAgo } from '../domain/date';
import type { MemberId } from '../domain/ids';
import { Page404 } from '../shell/errors';
import { linkTo } from '../shell/shell';
import { allTasks, canSee, copy, isOver, memberById, newTask, setUi, sortTasks, teamOrNone, useStore, visibleProjects } from '../store';
import { Avatar, Empty, ProjectIcon, Tag } from '../ui/helpers';
import { Feed, Grid2, LineTabs, Page, Panel, PanelHeader, Stack, Stat, Stats, stretched } from './kit';
import { MemberMenu } from './menus';

export function MemberPage({ id }: { id: MemberId }) {
  const d = useStore(s => s.data);
  const tab = useStore(s => s.ui.memTab);
  const m = memberById(d, id);
  if (!m) return <Page404 />;
  const ts = allTasks(d).filter(t => t.assignee === m.id);
  const open = ts.filter(t => t.status !== 'done');
  const done = ts.filter(t => t.status === 'done');
  const over = open.filter(isOver).length;
  const ps = visibleProjects(d).filter(p => p.members.includes(m.id) && p.status !== 'complete' && canSee(d, p));
  const acts = d.activity.filter(a => a.by === m.id).slice(0, 8);
  const online = m.last != null && m.last < 5;
  const list = tab === 'assigned' ? sortTasks(d, open, { f: 'due', dir: 1 }) : done;
  return (
    <Page>
      <div className="mb-5.5 flex flex-wrap items-start gap-4.5">
        <Avatar id={m.id} size="xl" tip={false} presence={online} />
        <div className="min-w-55 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl leading-[1.45] font-semibold">{m.name}</h1>
            <Tag tone="muted">
              {m.role === 'Owner' && <Crown />}
              {m.role}
            </Tag>
            {m.status === 'invited' && <Tag tone="amber">Invite pending</Tag>}
          </div>
          <div className="mt-0.75 text-fg-2">{`${m.title} · ${teamOrNone(d, m.team).name}`}</div>
          <div className="mt-2 flex flex-wrap gap-3.5 text-sm text-muted-foreground [&_svg]:size-3.25">
            <span className="flex items-center gap-1.25">
              <Mail />
              <span className="select-all">{m.email}</span>
            </span>
            <span className="flex items-center gap-1.25">
              <MapPin />
              {m.tz}
            </span>
            <span className="flex items-center gap-1.25">
              <Clock />
              {m.last == null ? 'Never signed in' : online ? 'Online now' : `Active ${ago(minsAgo(m.last))}`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" onClick={() => void copy(m.email, 'Copied to clipboard')}>
            <Copy />
            Copy email
          </Button>
          <Button onClick={() => newTask({ assignee: m.id })}>
            <Plus />
            Assign task
          </Button>
          <MemberMenu id={m.id}>
            <Button variant="ghost" size="icon" aria-label="More">
              <Ellipsis />
            </Button>
          </MemberMenu>
        </div>
      </div>
      <Stats className="mb-4.5">
        <Stat k="Active projects" v={ps.length} />
        <Stat k="Assigned tasks" v={open.length} />
        <Stat k="Completed tasks" v={done.length} />
        <Stat k="Overdue" v={over} tone={over ? 'bad' : undefined} />
      </Stats>
      <Grid2>
        <Panel>
          <LineTabs
            label="Tasks"
            className="px-2"
            value={tab}
            onChange={v => setUi('memTab', v)}
            items={[
              { value: 'assigned', label: `Assigned · ${open.length}` },
              { value: 'completed', label: `Completed · ${done.length}` },
            ]}
          />
          <div className="*:first:border-t-0">
            {list.length ? (
              list.map(t => <MiniRow key={t.id} t={t} av={false} />)
            ) : (
              <Empty icon={ListChecks} title="No tasks here" text="Nothing to show in this list." level={3} className="py-8" />
            )}
          </div>
        </Panel>
        <Stack>
          <Panel>
            <PanelHeader title="Active projects" />
            {ps.length ? (
              ps.map(p => (
                <div key={p.id} className="relative flex min-h-9.5 items-center gap-2.5 border-t border-divider px-3.5 transition-colors hover:bg-muted">
                  <ProjectIcon p={p} />
                  <a {...linkTo({ r: 'project', id: p.id })} className={cn(stretched, 'min-w-0 flex-1 truncate')}>
                    {p.name}
                  </a>
                  <span className="text-xs text-muted-foreground">{p.lead === m.id ? 'Lead' : 'Member'}</span>
                </div>
              ))
            ) : (
              <div className="px-3.5 pb-3.5 text-muted-foreground">No active projects</div>
            )}
          </Panel>
          <Panel>
            <PanelHeader title="Recent activity" />
            <div className="px-3.5 pb-3.5">
              {acts.length ? (
                <Feed lined={false}>
                  {acts.map(a => (
                    <ActivityItem key={a.id} a={a} />
                  ))}
                </Feed>
              ) : (
                <span className="text-muted-foreground">No recent activity</span>
              )}
            </div>
          </Panel>
        </Stack>
      </Grid2>
    </Page>
  );
}
