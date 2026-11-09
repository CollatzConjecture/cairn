/* The workspace Calendar page: deadlines and events across every project. */
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, flushHeader } from '../pages/kit';
import { allTasks, applyView, newTask, useStore, useView } from '../store';
import { CalendarView } from './calendar-view';
import { ViewToolbar } from './view-toolbar';

export function CalendarPage() {
  const d = useStore(s => s.data);
  const v = useView('cal');
  return (
    <div className="flex h-full flex-col">
      <PageHeader className={flushHeader} title="Calendar" sub="Deadlines and events across every project.">
        <Button onClick={() => newTask()}>
          <Plus />
          New task
        </Button>
      </PageHeader>
      <ViewToolbar viewKey="cal" group={false} />
      <CalendarView tasks={applyView(d, allTasks(d), v)} viewKey="cal" events />
    </div>
  );
}
