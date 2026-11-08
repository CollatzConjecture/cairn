import { Activity as ActivityIcon } from 'lucide-react';
import { ActivityItem } from '../components/task-list';
import { dayBucket } from '../domain/date';
import type { Activity } from '../domain/schema';
import { canSee, projectById, set, setUi, useStore, type Ui } from '../store';
import { Empty } from '../ui/helpers';
import { DayHeading, Feed, Page, PageHeader, Seg, SelectField, groupBy, type Option } from './kit';

const KINDS: Record<Ui['actFilter'], (a: Activity) => boolean> = {
  all: () => true,
  status: a => /moved|completed|reopened/.test(a.verb),
  comments: a => a.verb.includes('comment'),
  projects: a => a.verb.includes('project'),
};

export function ActivityPage() {
  const d = useStore(s => s.data);
  const f = useStore(s => s.ui.actFilter);
  const who = useStore(s => s.ui.actWho);
  const as = d.activity.filter(a => (!a.project || canSee(d, projectById(d, a.project))) && KINDS[f](a) && (who === 'all' || a.by === who));
  const people: Option<string>[] = [{ value: 'all', label: 'Everyone' }, ...d.members.map(m => ({ value: m.id, label: m.name }))];
  return (
    <Page className="max-w-205">
      <PageHeader title="Activity" sub="Everything that's changed across the workspace." />
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <Seg
          label="Kind of change"
          value={f}
          onChange={v => setUi('actFilter', v)}
          items={[
            { value: 'all', label: 'All' },
            { value: 'status', label: 'Status changes' },
            { value: 'comments', label: 'Comments' },
            { value: 'projects', label: 'Projects' },
          ]}
        />
        <SelectField
          size="sm"
          label="Filter by person"
          value={who}
          options={people}
          onChange={v =>
            set(s => {
              s.ui.actWho = v;
            })
          }
        />
      </div>
      {as.length ? (
        groupBy(as, a => dayBucket(a.at)).map(([b, list]) => (
          <section key={b} aria-label={b}>
            <DayHeading>{b}</DayHeading>
            <Feed>
              {list.map(a => (
                <ActivityItem key={a.id} a={a} proj />
              ))}
            </Feed>
          </section>
        ))
      ) : (
        <Empty icon={ActivityIcon} title="No activity yet" text="Changes to tasks and projects will appear here." />
      )}
    </Page>
  );
}
