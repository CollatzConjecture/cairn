import { List, Plus, SquareKanban, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskList } from '../components/task-list';
import { groupTasks } from '../components/view-engine';
import { Board } from '../project/board';
import { TableView } from '../project/table-view';
import { ViewToolbar } from '../project/view-toolbar';
import { allTasks, applyView, canSee, newTask, updateView, useStore, useView, visibleProjects } from '../store';
import { PageHeader, Seg, flushHeader } from './kit';
import { listWrap } from './my-tasks';

export function TasksPage() {
  const d = useStore(s => s.data);
  const v = useView('tasks');
  const mode = v.mode ?? 'list';
  const ts = applyView(d, allTasks(d), v);
  const right = (
    <Seg
      label="Layout"
      value={mode}
      onChange={m => updateView('tasks', x => void (x.mode = m))}
      items={[
        { value: 'list', label: <span className="max-sm:hidden">List</span>, icon: <List />, aria: 'List' },
        { value: 'board', label: <span className="max-sm:hidden">Board</span>, icon: <SquareKanban />, aria: 'Board' },
        { value: 'table', label: <span className="max-sm:hidden">Table</span>, icon: <Table2 />, aria: 'Table' },
      ]}
    />
  );
  return (
    <div className="flex h-full flex-col">
      <PageHeader className={flushHeader} title="Tasks" sub={`Every task across ${visibleProjects(d).filter(p => canSee(d, p)).length} projects.`}>
        <Button onClick={() => newTask()}>
          <Plus />
          New task
        </Button>
      </PageHeader>
      <ViewToolbar viewKey="tasks" right={right} cols={mode === 'table'} group={mode !== 'board'} />
      {mode === 'board' ? (
        <Board tasks={ts} viewKey="tasks" />
      ) : mode === 'table' ? (
        <TableView tasks={ts} viewKey="tasks" />
      ) : (
        <div className={listWrap}>
          <TaskList groups={groupTasks(d, ts, v.group)} viewKey="tasks" cols={['status', 'assignee', 'priority', 'due', 'project']} />
        </div>
      )}
    </div>
  );
}
