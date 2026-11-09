import { Pencil, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MiniRow } from '../components/task-list';
import type { TeamId } from '../domain/ids';
import { Page404 } from '../shell/errors';
import { linkTo } from '../shell/shell';
import { allTasks, invite, progressOf, sortTasks, teamById, useStore, visibleProjects } from '../store';
import { Avatar, ProgressBar, ProjectIcon, ProjectStatusBadge, Tag } from '../ui/helpers';
import { Grid2, Page, Panel, PanelHeader, Stack, stretched } from './kit';
import { editTeam } from './team-modal';
import { TeamIcon } from './teams-grid';

const row = 'relative flex min-h-9.5 items-center gap-2.5 border-t border-divider px-3.5 transition-colors hover:bg-muted';
const count = (n: number) => <span className="text-muted-foreground">{n}</span>;

export function TeamPage({ id }: { id: TeamId }) {
  const d = useStore(s => s.data);
  const t = teamById(d, id);
  if (!t) return <Page404 />;
  const ms = d.members.filter(m => m.team === t.id);
  const ps = visibleProjects(d).filter(p => p.team === t.id);
  const ts = allTasks(d).filter(x => ms.some(m => m.id === x.assignee) && x.status !== 'done');
  return (
    <Page>
      <div className="mb-5 flex flex-wrap items-start gap-3">
        <div className="flex items-center gap-3">
          <TeamIcon t={t} className="size-9" />
          <div>
            <h1 className="text-2xl leading-[1.2] font-semibold tracking-[-0.022em] max-sm:text-xl">{t.name}</h1>
            <p className="mt-0.5 text-fg-2">{t.desc}</p>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1.5 max-sm:ml-0 max-sm:w-full">
          <Button variant="outline" onClick={() => editTeam(t.id)}>
            <Pencil />
            Edit team
          </Button>
          <Button variant="outline" onClick={invite}>
            <UserPlus />
            Invite to workspace
          </Button>
        </div>
      </div>
      <Grid2>
        <Stack>
          <Panel>
            <PanelHeader title={<>Projects {count(ps.length)}</>} />
            {ps.length ? (
              ps.map(p => (
                <div key={p.id} className={row}>
                  <ProjectIcon p={p} />
                  <a {...linkTo({ r: 'project', id: p.id })} className={cn(stretched, 'min-w-0 flex-1 truncate')}>
                    {p.name}
                  </a>
                  <ProjectStatusBadge s={p.status} />
                  <span className="flex w-30 items-center">
                    <ProgressBar v={progressOf(d, p.id)} />
                  </span>
                </div>
              ))
            ) : (
              <div className="px-3.5 pb-3.5 text-muted-foreground">No projects</div>
            )}
          </Panel>
          <Panel>
            <PanelHeader title={<>Open tasks {count(ts.length)}</>} />
            {sortTasks(d, ts, { f: 'due', dir: 1 })
              .slice(0, 8)
              .map(x => (
                <MiniRow key={x.id} t={x} />
              ))}
          </Panel>
        </Stack>
        <Panel className="self-start">
          <PanelHeader title={<>Members {count(ms.length)}</>} />
          {ms.map(m => (
            <div key={m.id} className={cn(row, 'min-h-12')}>
              <Avatar id={m.id} size="md" tip={false} />
              <div className="min-w-0 flex-1">
                <a {...linkTo({ r: 'member', id: m.id })} className={cn(stretched, 'block font-medium')}>
                  {m.name}
                </a>
                <div className="text-xs text-muted-foreground">{m.title}</div>
              </div>
              <Tag tone="muted">{m.role}</Tag>
            </div>
          ))}
        </Panel>
      </Grid2>
    </Page>
  );
}
