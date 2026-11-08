import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MiniRow } from '../components/task-list';
import { linkTo } from '../shell/shell';
import { allTasks, canSee, useStore, visibleProjects } from '../store';
import { Empty } from '../ui/helpers';
import { Page, PageHeader, Panel } from './kit';
import { ProjectGrid } from './projects';

export function FavoritesPage() {
  const d = useStore(s => s.data);
  const ps = visibleProjects(d).filter(p => p.fav && canSee(d, p));
  const ts = allTasks(d).filter(t => t.fav);
  const h2 = 'flex items-center gap-1.5 text-md font-semibold tracking-[-0.01em]';
  return (
    <Page className="max-w-none">
      <PageHeader title="Favorites" sub="Projects and tasks you've starred for quick access." />
      {!ps.length && !ts.length ? (
        <Panel>
          <Empty icon={Star} title="No favorites yet" text="Star a project or task to pin it here.">
            <Button variant="outline" size="sm" nativeButton={false} render={<a {...linkTo({ r: 'projects' })} />}>
              Browse projects
            </Button>
          </Empty>
        </Panel>
      ) : (
        <>
          <h2 className={`${h2} mb-2.5`}>
            Projects <span className="font-medium text-muted-foreground">{ps.length}</span>
          </h2>
          <div className="mb-7">{ps.length ? <ProjectGrid ps={ps} /> : <p className="text-muted-foreground">No favorite projects.</p>}</div>
          <h2 className={`${h2} mb-1.5`}>
            Tasks <span className="font-medium text-muted-foreground">{ts.length}</span>
          </h2>
          {ts.length ? (
            <Panel className="*:first:border-t-0">
              {ts.map(t => (
                <MiniRow key={t.id} t={t} />
              ))}
            </Panel>
          ) : (
            <p className="text-muted-foreground">Open a task and click the star to add it here.</p>
          )}
        </>
      )}
    </Page>
  );
}
