/* The workspace Calendar page: deadlines and events across every project. */
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { allTasks, applyView, newTask, useStore, useView } from '../store';
import { CalendarView } from './calendar-view';
import { ViewToolbar } from './view-toolbar';

export function CalendarPage() {
  const d = useStore(s => s.data);
  const v = useView('cal');
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-start gap-3 px-(--gutter) pt-6 pb-3">
        <div>
          <h1 className="text-2xl leading-[1.2] font-semibold tracking-[-0.022em] max-sm:text-xl">Calendar</h1>
          <p className="mt-1 text-fg-2">Deadlines and events across every project.</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 max-sm:ml-0 max-sm:w-full">
          <Button onClick={() => newTask()}>
            <Plus />
            New task
          </Button>
        </div>
      </div>
      <ViewToolbar viewKey="cal" group={false} />
      <CalendarView tasks={applyView(d, allTasks(d), v)} viewKey="cal" events />
    </div>
  );
}
