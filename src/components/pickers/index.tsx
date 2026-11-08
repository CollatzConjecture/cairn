/* Shared field pickers. Each takes the current value, an onChange, and its trigger as the only child:
     <StatusPicker value={t.status} onChange={status => updateTask(t.id, { status })}><button …/></StatusPicker>
   The option lists are exported too, for context-menu submenus (`PickerRadioItems`). */
import type { ReactElement } from 'react';
import { Repeat, Timer, X } from 'lucide-react';
import { ESTIMATES, LABELS, PRIOS, RECURS, STATUSES, type LabelId, type Priority, type Recur, type Status } from '../../domain/constants';
import type { MemberId, ProjectId, TaskId } from '../../domain/ids';
import type { Data, Task } from '../../domain/schema';
import { canSee, pColor, useStore, visibleProjects } from '../../store';
import { Avatar, Dot, PriorityIcon, StatusIcon } from '../../ui/helpers';
import { ComboPicker, MenuPicker, type PickOption } from './primitives';

export { DatePicker } from './date-picker';
export { ComboPicker, MenuPicker, PickerRadioItems, type PickOption } from './primitives';

type Trigger = { children: ReactElement };

export const STATUS_OPTIONS: PickOption<Status>[] = STATUSES.map((s, i) => ({
  value: s.id,
  label: s.name,
  icon: <StatusIcon st={s.id} />,
  kbd: String(i + 1),
}));
export const PRIORITY_OPTIONS: PickOption<Priority>[] = PRIOS.map(p => ({ value: p.id, label: p.name, icon: <PriorityIcon p={p.id} /> }));
export const LABEL_OPTIONS: PickOption<LabelId>[] = LABELS.map(l => ({ value: l.id, label: l.name, icon: <Dot c={l.c} /> }));
const NO_REPEAT = 'Does not repeat' as const;
const RECUR_OPTIONS: PickOption<Recur | typeof NO_REPEAT>[] = [NO_REPEAT, ...RECURS].map((r: Recur | typeof NO_REPEAT) => ({
  value: r,
  label: r,
  icon: <Repeat />,
}));
const NO_ESTIMATE = 'none';
const ESTIMATE_OPTIONS: PickOption<string>[] = [
  ...ESTIMATES.map(e => ({ value: e, label: e, icon: <Timer /> })),
  { value: NO_ESTIMATE, label: 'Clear estimate', icon: <X /> },
];

/** Unassigned is the empty string inside a picker and null outside it. */
const UNASSIGNED = '';
export function assigneeOptions(d: Data): PickOption<MemberId | typeof UNASSIGNED>[] {
  return [
    { value: UNASSIGNED, label: 'Unassigned', icon: <Avatar id={null} size="sm" tip={false} /> },
    ...d.members
      .filter(m => m.status !== 'deactivated')
      .map(m => ({ value: m.id, label: m.name + (m.id === d.me ? ' (you)' : ''), icon: <Avatar id={m.id} size="sm" tip={false} /> })),
  ];
}
/** Projects a task can move to: visible, not completed. */
export const projectOptions = (d: Data): PickOption<ProjectId>[] =>
  visibleProjects(d)
    .filter(p => canSee(d, p) && p.status !== 'complete')
    .map(p => ({ value: p.id, label: p.name, icon: <Dot c={pColor(p)} /> }));

export const StatusPicker = ({ value, onChange, children }: Trigger & { value: Status | null; onChange: (v: Status) => void }) => (
  <MenuPicker value={value} onChange={onChange} options={STATUS_OPTIONS}>
    {children}
  </MenuPicker>
);
export const PriorityPicker = ({ value, onChange, children }: Trigger & { value: Priority | null; onChange: (v: Priority) => void }) => (
  <MenuPicker value={value} onChange={onChange} options={PRIORITY_OPTIONS}>
    {children}
  </MenuPicker>
);
export const RecurPicker = ({ value, onChange, children }: Trigger & { value: Recur | null; onChange: (v: Recur | null) => void }) => (
  <MenuPicker value={value ?? NO_REPEAT} onChange={v => onChange(v === NO_REPEAT ? null : v)} options={RECUR_OPTIONS}>
    {children}
  </MenuPicker>
);
export const EstimatePicker = ({ value, onChange, children }: Trigger & { value: string | null; onChange: (v: string | null) => void }) => (
  <MenuPicker value={value} onChange={v => onChange(v === NO_ESTIMATE ? null : v)} options={ESTIMATE_OPTIONS}>
    {children}
  </MenuPicker>
);

export function AssigneePicker({ value, onChange, children }: Trigger & { value: MemberId | null; onChange: (v: MemberId | null) => void }) {
  const d = useStore(s => s.data);
  return (
    <ComboPicker value={value ?? UNASSIGNED} onPick={v => onChange(v || null)} options={assigneeOptions(d)} placeholder="Assign to…">
      {children}
    </ComboPicker>
  );
}
export function ProjectPicker({ value, onChange, children }: Trigger & { value: ProjectId | null; onChange: (v: ProjectId) => void }) {
  const d = useStore(s => s.data);
  return (
    <ComboPicker value={value} onPick={onChange} options={projectOptions(d)} placeholder="Move to project…">
      {children}
    </ComboPicker>
  );
}
export const LabelsPicker = ({ value, onChange, children }: Trigger & { value: readonly LabelId[]; onChange: (v: LabelId[]) => void }) => (
  <ComboPicker
    multiple
    value={value}
    onPick={l => onChange(value.includes(l) ? value.filter(x => x !== l) : [...value, l])}
    options={LABEL_OPTIONS}
    placeholder="Filter labels…"
  >
    {children}
  </ComboPicker>
);
/** The tasks `task` can be blocked by: others in its project that are not archived. */
export function DepsPicker({ task, onChange, children }: Trigger & { task: Task; onChange: (v: TaskId[]) => void }) {
  const tasks = useStore(s => s.data.tasks);
  const options = tasks
    .filter(x => x.project === task.project && x.id !== task.id && !x.archived)
    .map(x => ({ value: x.id, label: `${x.key}  ${x.title}`, icon: <StatusIcon st={x.status} /> }));
  return (
    <ComboPicker
      multiple
      value={task.deps}
      onPick={id => onChange(task.deps.includes(id) ? task.deps.filter(x => x !== id) : [...task.deps, id])}
      options={options}
      placeholder="Blocked by…"
      className="w-80"
    >
      {children}
    </ComboPicker>
  );
}
