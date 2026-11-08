/* The system states gallery: empty, loading, error and confirmation states used throughout Cairn. */
import { useState, type ComponentType, type ReactNode } from 'react';
import {
  Archive,
  Bell,
  BellOff,
  CircleAlert,
  CloudAlert,
  FileQuestionMark,
  FolderKanban,
  LayoutGrid,
  ListChecks,
  Loader,
  Lock,
  Plus,
  RefreshCw,
  Rows3,
  Search,
  SearchX,
  SquareKanban,
  TextCursorInput,
  Trash,
  UserMinus,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton as Sk } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { projectId, memberId, taskId } from '../domain/ids';
import { SkRows } from '../shell/skeletons';
import { archiveProject, delProject, delTask, go, newProject, newTask, removeMember, set, toast, toggleOffline, useStore } from '../store';
import { Empty } from '../ui/helpers';
import { Callout, Page, PageHeader } from './kit';

function Card({ cap, icon: I, children }: { cap: string; icon: ComponentType<{ className?: string }>; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card" aria-label={cap}>
      <div className="flex items-center gap-1.5 border-b px-3 py-2 text-xs font-medium text-fg-2">
        <I className="size-3.25" />
        {cap}
      </div>
      {children}
    </section>
  );
}
const Grid = ({ children }: { children: ReactNode }) => (
  <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3 max-sm:grid-cols-1">{children}</div>
);
const H2 = ({ children, first = false }: { children: ReactNode; first?: boolean }) => (
  <h2 className={first ? 'mt-2 mb-2.5 text-md font-semibold tracking-[-0.01em]' : 'mt-7 mb-2.5 text-md font-semibold tracking-[-0.01em]'}>{children}</h2>
);
const sm = 'py-8';

function retryToast() {
  toast('Retrying…', { kind: 'info', ms: 1200 });
  setTimeout(() => toast('Loaded successfully'), 1300);
}
/** Show the current page's skeleton for a moment. */
function replaySkeleton() {
  set(s => {
    s.ui.loading = true;
  });
  setTimeout(
    () =>
      set(s => {
        s.ui.loading = false;
      }),
    1400,
  );
}

function LoadButton() {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      disabled={busy}
      onClick={() => {
        setBusy(true);
        setTimeout(() => {
          setBusy(false);
          toast('Loaded');
        }, 1400);
      }}
    >
      {busy && <Spinner />}
      Click to load
    </Button>
  );
}

export function StatesPage() {
  const offline = useStore(s => s.ui.offline);
  return (
    <Page className="max-w-310">
      <PageHeader title="System states" sub="Empty, loading, error, and confirmation states used throughout Cairn.">
        <Button variant="outline" onClick={toggleOffline}>
          {offline ? <Wifi /> : <WifiOff />}
          {offline ? 'Go back online' : 'Simulate offline'}
        </Button>
      </PageHeader>

      <H2 first>Empty states</H2>
      <Grid>
        <Card cap="No projects" icon={FolderKanban}>
          <Empty icon={FolderKanban} title="No projects yet" text="Create your first project to start organizing your work." level={3}>
            <Button size="sm" onClick={newProject}>
              <Plus />
              Create project
            </Button>
          </Empty>
        </Card>
        <Card cap="No tasks" icon={ListChecks}>
          <Empty icon={ListChecks} title="No tasks here" text="Add a task to get things moving." level={3}>
            <Button size="sm" onClick={() => newTask()}>
              <Plus />
              Add task
            </Button>
          </Empty>
        </Card>
        <Card cap="No notifications" icon={Bell}>
          <Empty icon={BellOff} title="You're all caught up." text="New mentions and assignments will show up here." level={3} />
        </Card>
        <Card cap="No search results" icon={Search}>
          <Empty icon={SearchX} title="No results found" text="Nothing matches “brand guidlines”. Check the spelling or try a broader term." level={3}>
            <Button variant="outline" size="sm">
              Clear search
            </Button>
          </Empty>
        </Card>
      </Grid>

      <H2>Loading states</H2>
      <Grid>
        <Card cap="List / table rows" icon={Rows3}>
          <div className="px-2.5 py-1">
            <SkRows n={5} />
          </div>
        </Card>
        <Card cap="Cards" icon={LayoutGrid}>
          <div className="p-3">
            <div className="flex flex-col gap-3 rounded-xl border p-3.5">
              <Sk className="size-7 rounded-md" />
              <Sk className="h-3 w-3/5" />
              <Sk className="h-2.25 w-[90%]" />
              <Sk className="h-2.25 w-[70%]" />
              <Sk className="h-1 w-full" />
            </div>
          </div>
        </Card>
        <Card cap="Board column" icon={SquareKanban}>
          <div className="flex flex-col gap-1.5 bg-sunken p-3">
            {[0, 1].map(i => (
              <div key={i} className="flex flex-col gap-2.5 rounded-xl bg-card p-(--card-pad) shadow-card">
                <Sk className="h-3.5 w-2/5" />
                <Sk className="h-2.5 w-4/5" />
                <div className="flex items-center">
                  <Sk className="h-2.25 w-10" />
                  <Sk className="ml-auto size-4.5 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card cap="Buttons & page" icon={Loader}>
          <div className="flex flex-col items-start gap-3.5 p-4.5">
            <div className="flex flex-wrap items-center gap-2">
              <Button disabled>
                <Spinner />
                Saving
              </Button>
              <Button variant="outline" disabled>
                <Spinner />
                Loading
              </Button>
              <LoadButton />
            </div>
            <div className="flex items-center gap-2 text-[13px] text-fg-2">
              <Spinner className="size-4 text-primary" />
              Loading project…
            </div>
            <Button variant="ghost" size="sm" onClick={replaySkeleton}>
              <RefreshCw />
              Replay page skeleton
            </Button>
          </div>
        </Card>
      </Grid>

      <H2>Error states</H2>
      <Grid>
        <Card cap="Network error" icon={WifiOff}>
          <Empty
            icon={WifiOff}
            tone="error"
            title="You're offline"
            text="Check your connection. We'll sync your changes when you're back."
            level={3}
            className={sm}
          >
            <Button variant="outline" size="sm" onClick={retryToast}>
              <RefreshCw />
              Try again
            </Button>
          </Empty>
        </Card>
        <Card cap="Failed to load" icon={CloudAlert}>
          <Empty icon={CloudAlert} tone="error" title="Something went wrong." text="This view failed to load. Your data is safe." level={3} className={sm}>
            <Button variant="outline" size="sm" onClick={retryToast}>
              Try again
            </Button>
          </Empty>
        </Card>
        <Card cap="Failed to save" icon={CircleAlert}>
          <div className="flex flex-col items-start gap-2.5 p-4.5">
            <Callout tone="danger" icon={CircleAlert} className="w-full">
              <b className="font-semibold">Your changes couldn&apos;t be saved.</b>
              <div className="text-fg-2">The server didn&apos;t respond in time.</div>
            </Callout>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast("Your changes couldn't be saved.", { kind: 'err', action: 'Try again', onAction: () => toast('Saved') })}
            >
              Show as toast
            </Button>
          </div>
        </Card>
        <Card cap="Permission denied" icon={Lock}>
          <Empty icon={Lock} title="You don't have access" text="Customer Portal is private. Request access from Marcus Lee." level={3} className={sm}>
            <Button variant="outline" size="sm" onClick={() => go({ r: 'project', id: projectId('p6') })}>
              Open example
            </Button>
          </Empty>
        </Card>
        <Card cap="Page not found" icon={FileQuestionMark}>
          <Empty icon={FileQuestionMark} title="Page not found" text="The page was moved, deleted, or never existed." level={3} className={sm}>
            <Button variant="outline" size="sm" nativeButton={false} render={<a href="/nowhere" />}>
              Open example
            </Button>
          </Empty>
        </Card>
        <Card cap="Form validation" icon={TextCursorInput}>
          <div className="flex flex-col gap-1.5 p-4.5">
            <Label htmlFor="st-e" className="text-sm font-medium text-foreground">
              Email
            </Label>
            <Input id="st-e" defaultValue="hello@example" aria-invalid aria-describedby="st-e-err" />
            <span id="st-e-err" className="flex items-center gap-1 text-xs text-destructive">
              <CircleAlert className="size-3" />
              Enter a valid email, like name@company.com
            </span>
          </div>
        </Card>
      </Grid>

      <H2>Confirmation dialogs</H2>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => void delProject(projectId('p5'))}>
          <Trash />
          Delete project
        </Button>
        <Button variant="outline" onClick={() => void delTask(taskId('t10'), { demo: true })}>
          <Trash />
          Delete task
        </Button>
        <Button variant="outline" onClick={() => void removeMember(memberId('m8'))}>
          <UserMinus />
          Remove member
        </Button>
        <Button variant="outline" onClick={() => void archiveProject(projectId('p7'))}>
          <Archive />
          Archive project
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        These open the real dialogs. Confirming performs the action on demo data; use Help → Reset demo data to restore.
      </p>
    </Page>
  );
}
