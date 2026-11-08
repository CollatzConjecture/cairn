import type { ReactNode } from 'react';
import { Archive, RotateCcw, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PSTAT } from '../domain/constants';
import { ago } from '../domain/date';
import type { TaskId } from '../domain/ids';
import {
  canSee,
  confirm,
  delProject,
  deleteTasks,
  get,
  logAct,
  mutate,
  openTask,
  projectById,
  restoreProject,
  setUi,
  taskById,
  toast,
  useStore,
} from '../store';
import { Empty, ProjectIcon, StatusIcon, Tip } from '../ui/helpers';
import { LineTabs, Page, PageHeader, Panel } from './kit';
export function restoreTask(id: TaskId) {
  const t = taskById(get().data, id);
  if (!t) return;
  if (
    mutate(s => {
      const x = taskById(s.data, id);
      if (!x) return;
      x.archived = false;
      x.archivedAt = null;
      logAct(s.data, 'restored', x);
    })
  )
    toast(`Restored “${t.title}”`, { action: 'Open', onAction: () => openTask(id) });
}
/** Delete an archived task for good, after confirming. */
export async function purgeTask(id: TaskId) {
  const t = taskById(get().data, id);
  if (!t) return;
  const ok = await confirm({
    title: 'Delete task permanently?',
    body: [{ b: t.title }, ", its subtasks, comments, and attachments will be deleted for everyone. This can't be undone."],
    ok: 'Delete permanently',
    danger: true,
  });
  if (ok && mutate(s => deleteTasks(s, [id]))) toast(`Deleted “${t.title}”`);
}

function ArchRow({
  lead,
  title,
  sub,
  at,
  onRestore,
  onDelete,
}: {
  lead: ReactNode;
  title: string;
  sub: ReactNode;
  at: number | null | undefined;
  onRestore: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex min-h-13 items-center gap-3 px-3.5 not-first:border-t not-first:border-divider">
      {lead}
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{title}</div>
        <div className="truncate text-xs text-muted-foreground">{sub}</div>
      </div>
      <span className="text-xs whitespace-nowrap text-muted-foreground max-sm:hidden">{at ? `Archived ${ago(at)}` : 'Archived'}</span>
      <Button variant="outline" size="sm" onClick={onRestore} aria-label={`Restore ${title}`}>
        <RotateCcw />
        Restore
      </Button>
      <Tip label="Delete permanently">
        <Button variant="ghost" size="icon-sm" className="text-red hover:text-red" aria-label={`Delete ${title} permanently`} onClick={onDelete}>
          <Trash />
        </Button>
      </Tip>
    </div>
  );
}

export function ArchivePage() {
  const d = useStore(s => s.data);
  const tab = useStore(s => s.ui.archTab);
  const ts = d.tasks
    .filter(t => t.archived && canSee(d, projectById(d, t.project)) && !projectById(d, t.project)?.archived)
    .sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0));
  const ps = d.projects.filter(p => p.archived);
  return (
    <Page className="max-w-225">
      <PageHeader title="Archive" sub="Archived work is hidden everywhere else. Restore it any time, or delete it for good." />
      <LineTabs
        label="Archive"
        className="mb-3.5"
        value={tab}
        onChange={v => setUi('archTab', v)}
        items={[
          { value: 'tasks', label: 'Tasks', count: ts.length },
          { value: 'projects', label: 'Projects', count: ps.length },
        ]}
      />
      {tab === 'tasks' ? (
        ts.length ? (
          <Panel>
            {ts.map(t => (
              <ArchRow
                key={t.id}
                lead={<StatusIcon st={t.status} className="size-3.75" />}
                title={t.title}
                sub={
                  <>
                    <span className="font-mono">{t.key}</span>
                    {` · ${projectById(d, t.project)?.name}`}
                  </>
                }
                at={t.archivedAt}
                onRestore={() => restoreTask(t.id)}
                onDelete={() => void purgeTask(t.id)}
              />
            ))}
          </Panel>
        ) : (
          <Panel>
            <Empty
              icon={Archive}
              title="No archived tasks"
              text="Archive finished or abandoned tasks to keep boards focused. They wait here until you restore them."
            />
          </Panel>
        )
      ) : ps.length ? (
        <Panel>
          {ps.map(p => (
            <ArchRow
              key={p.id}
              lead={<ProjectIcon p={p} />}
              title={p.name}
              sub={`${d.tasks.filter(t => t.project === p.id).length} tasks · ${PSTAT[p.status].name}`}
              at={p.archivedAt}
              onRestore={() => restoreProject(p.id)}
              onDelete={() => void delProject(p.id)}
            />
          ))}
        </Panel>
      ) : (
        <Panel>
          <Empty
            icon={Archive}
            title="No archived projects"
            text="Archived projects disappear from the sidebar and project lists but keep every task, file, and comment."
          />
        </Panel>
      )}
    </Page>
  );
}
