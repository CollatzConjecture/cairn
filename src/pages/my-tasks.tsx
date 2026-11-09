import { Calendar, CalendarDays, CircleCheck, ClockAlert, List, Plus, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskList } from '../components/task-list';
import type { TaskGroup } from '../components/view-engine';
import { TODAY, dOff, diffD, parse } from '../domain/date';
import { CalendarView } from '../project/calendar-view';
import { ViewToolbar } from '../project/view-toolbar';
import { allTasks, applyView, isOver, newTask, setUi, useStore, useView } from '../store';
import { PageHeader, Seg, flushHeader } from './kit';

export const listWrap = 'pr-(--gutter) pb-22.5 pl-[calc(var(--gutter)-26px)] max-sm:px-(--gutter)';

export function MyTasksPage() {
  const d = useStore(s => s.data);
  const mode = useStore(s => s.ui.myView);
  const v = useView('mytasks');
  const mine = applyView(
    d,
    allTasks(d).filter(t => t.assignee === d.me),
    v.sort.f === 'manual' ? { ...v, sort: { f: 'due', dir: 1 } } : v,
  );
  const open = mine.filter(t => t.status !== 'done');
  const groups: TaskGroup[] = [
    { key: 'overdue', name: 'Overdue', icon: <ClockAlert className="size-3.5 text-red" />, tasks: mine.filter(isOver), set: {} },
    {
      key: 'today',
      name: 'Today',
      icon: <Sun className="size-3.5" />,
      tasks: open.filter(t => t.due && diffD(parse(t.due), TODAY) === 0),
      set: { due: dOff(0) },
    },
    {
      key: 'upcoming',
      name: 'Upcoming',
      icon: <CalendarDays className="size-3.5" />,
      tasks: open.filter(t => !t.due || diffD(parse(t.due), TODAY) > 0),
      set: { due: dOff(3) },
    },
    {
      key: 'completed',
      name: 'Completed',
      icon: <CircleCheck className="size-3.5 text-green" />,
      tasks: mine.filter(t => t.status === 'done'),
      set: { status: 'done' },
      collapsed: true,
    },
  ];
  const [over, today, upcoming] = groups;
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        className={flushHeader}
        title="My Tasks"
        sub={`${today?.tasks.length} due today · ${over?.tasks.length} overdue · ${upcoming?.tasks.length} upcoming`}
      >
        <Seg
          label="View"
          value={mode}
          onChange={x => setUi('myView', x)}
          items={[
            { value: 'list', label: 'List', icon: <List /> },
            { value: 'calendar', label: 'Calendar', icon: <Calendar /> },
          ]}
        />
        <Button onClick={() => newTask({ assignee: d.me })}>
          <Plus />
          New task
        </Button>
      </PageHeader>
      <ViewToolbar viewKey="mytasks" group={false} />
      {mode === 'calendar' ? (
        <CalendarView tasks={mine} viewKey="my" />
      ) : (
        <div className={listWrap}>
          <TaskList groups={groups} viewKey="mytasks" cols={['project', 'status', 'priority', 'due']} complete drag={false} keepEmpty />
        </div>
      )}
    </div>
  );
}
