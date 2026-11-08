/* View engine pieces that render: filter fields with their option icons, and task grouping. The pure filter/sort logic is in src/store/selectors.ts. */
import type { ReactNode } from 'react';
import { LABELS, PRIOS, STATUSES } from '../domain/constants';
import type { Data, FilterField, GroupBy, SortField, Task } from '../domain/schema';
import { canSee, matchFilter, pColor, visibleProjects } from '../store/selectors';
import type { TaskSet } from '../store/ui';
import { Calendar } from 'lucide-react';
import { Avatar, Dot, PriorityIcon, StatusIcon } from '../ui/helpers';
import type { IconName } from '../ui/icon';

export type TaskGroup = { key: string; name: string; icon?: ReactNode; set?: TaskSet; tasks: Task[]; collapsed?: boolean };
export type FieldOption = { id: string; name: string; icon?: ReactNode };

const dot = (c: string) => <Dot c={c} />;
const DATE_RANGES: FieldOption[] = [
  { id: '1', name: 'Last 24 hours' },
  { id: '7', name: 'Last 7 days' },
  { id: '30', name: 'Last 30 days' },
];
const DUE_BUCKETS = [
  { id: 'overdue', name: 'Overdue' },
  { id: 'today', name: 'Today' },
  { id: 'week', name: 'Next 7 days' },
  { id: 'later', name: 'Later' },
  { id: 'nodate', name: 'No due date' },
];

export const FIELDS: Record<FilterField, { name: string; icon: IconName }> = {
  status: { name: 'Status', icon: 'circle-dot' },
  assignee: { name: 'Assignee', icon: 'user' },
  priority: { name: 'Priority', icon: 'signal-high' },
  due: { name: 'Due date', icon: 'calendar' },
  project: { name: 'Project', icon: 'folder' },
  labels: { name: 'Labels', icon: 'tag' },
  created: { name: 'Created date', icon: 'calendar-plus' },
  updated: { name: 'Updated date', icon: 'history' },
};
/** The values a filter on `f` can take. */
export function fieldOptions(d: Data, f: FilterField): FieldOption[] {
  switch (f) {
    case 'status':
      return STATUSES.map(s => ({ id: s.id, name: s.name, icon: <StatusIcon st={s.id} /> }));
    case 'assignee':
      return [
        { id: 'none', name: 'Unassigned', icon: <Avatar id={null} size="sm" tip={false} /> },
        ...d.members.map(m => ({ id: m.id, name: m.name + (m.id === d.me ? ' (you)' : ''), icon: <Avatar id={m.id} size="sm" tip={false} /> })),
      ];
    case 'priority':
      return PRIOS.map(p => ({ id: p.id, name: p.name, icon: <PriorityIcon p={p.id} /> }));
    case 'due':
      return DUE_BUCKETS;
    case 'project':
      return visibleProjects(d)
        .filter(p => canSee(d, p))
        .map(p => ({ id: p.id, name: p.name, icon: dot(pColor(p)) }));
    case 'labels':
      return LABELS.map(l => ({ id: l.id, name: l.name, icon: dot(l.c) }));
    case 'created':
    case 'updated':
      return DATE_RANGES;
  }
}

export const SORT_NAMES: Record<SortField, string> = {
  manual: 'Manual',
  title: 'Title',
  due: 'Due date',
  priority: 'Priority',
  status: 'Status',
  created: 'Created',
  updated: 'Updated',
  assignee: 'Assignee',
  start: 'Start date',
  estimate: 'Estimate',
  project: 'Project',
};
export const GROUP_NAMES: Record<GroupBy, string> = {
  status: 'Status',
  priority: 'Priority',
  assignee: 'Assignee',
  project: 'Project',
  due: 'Due date',
  none: 'None',
};

/** Status and priority always show every group; the others drop empty groups. */
export function groupTasks(d: Data, ts: readonly Task[], g: GroupBy): TaskGroup[] {
  if (g === 'none') return [{ key: 'all', name: 'All tasks', tasks: [...ts] }];
  if (g === 'status')
    return STATUSES.map(s => ({ key: s.id, name: s.name, icon: <StatusIcon st={s.id} />, set: { status: s.id }, tasks: ts.filter(t => t.status === s.id) }));
  if (g === 'priority')
    return PRIOS.map(p => ({ key: p.id, name: p.name, icon: <PriorityIcon p={p.id} />, set: { priority: p.id }, tasks: ts.filter(t => t.priority === p.id) }));
  let groups: TaskGroup[];
  if (g === 'assignee')
    groups = [
      ...d.members.map(m => ({
        key: m.id,
        name: m.name,
        icon: <Avatar id={m.id} size="sm" tip={false} />,
        set: { assignee: m.id },
        tasks: ts.filter(t => t.assignee === m.id),
      })),
      { key: 'none', name: 'Unassigned', icon: <Avatar id={null} size="sm" tip={false} />, set: { assignee: null }, tasks: ts.filter(t => !t.assignee) },
    ];
  else if (g === 'project')
    groups = visibleProjects(d)
      .filter(p => canSee(d, p))
      .map(p => ({ key: p.id, name: p.name, icon: dot(pColor(p)), set: { project: p.id }, tasks: ts.filter(t => t.project === p.id) }));
  else
    groups = DUE_BUCKETS.map(b => ({
      key: b.id,
      name: b.name,
      icon: <Calendar className="size-3.5" />,
      tasks: ts.filter(t => matchFilter(t, { f: 'due', op: 'is', v: [b.id] })),
    }));
  return groups.filter(G => G.tasks.length);
}
