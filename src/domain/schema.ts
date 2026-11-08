/* The persisted model. These schemas parse what localStorage holds (the `gr8r.v2` shape) and are the source of the entity types. */
import { z } from 'zod';
import { ICONS, type IconName } from '../ui/icon';
import { FT, LB, PCOLORS, PERMS, PLANS, PR, PSTAT, RECURS, ROLES, ST, TEAMS_SEED } from './constants';
import { DATE_FORMATS } from './date';
import {
  ActivityIdSchema,
  CommentIdSchema,
  EventIdSchema,
  FileIdSchema,
  MemberIdSchema,
  NotifIdSchema,
  ProjectIdSchema,
  SessionIdSchema,
  SubtaskIdSchema,
  TaskIdSchema,
  TeamIdSchema,
  ViewIdSchema,
  WorkspaceIdSchema,
} from './ids';

const keyOf = <T extends object>(o: T) => z.custom<keyof T & string>(v => typeof v === 'string' && Object.hasOwn(o, v));
const oneOf = <const T extends readonly string[]>(xs: T) => z.custom<T[number]>(v => typeof v === 'string' && xs.includes(v));

const Ts = z.number();
const IsoDate = z.string();
/** An icon name the app does not know falls back to a folder rather than failing the whole load. */
const Icon = keyOf(ICONS).catch('folder' satisfies IconName);
/** Older saves have '' for "no team"; the model uses null. */
const TeamRef = z.union([TeamIdSchema.refine(s => s !== ''), z.literal('').transform(() => null), z.null()]);

export const StatusSchema = keyOf(ST);
export const PrioritySchema = keyOf(PR);
export const LabelSchema = keyOf(LB);
export const RecurSchema = oneOf(RECURS);

export const SubtaskSchema = z.object({
  id: SubtaskIdSchema,
  title: z.string(),
  done: z.boolean(),
  assignee: MemberIdSchema.nullable().optional(),
  due: IsoDate.nullable().optional(),
  note: z.string().optional(),
});
export const AttachmentSchema = z.object({
  id: FileIdSchema,
  name: z.string(),
  type: keyOf(FT),
  size: z.string(),
  by: MemberIdSchema,
  at: Ts,
});
export const TaskSchema = z.object({
  id: TaskIdSchema,
  key: z.string(),
  project: ProjectIdSchema,
  title: z.string(),
  status: StatusSchema,
  assignee: MemberIdSchema.nullable(),
  priority: PrioritySchema,
  due: IsoDate.nullable(),
  start: IsoDate.nullable(),
  labels: z.array(LabelSchema),
  subtasks: z.array(SubtaskSchema),
  attachments: z.array(AttachmentSchema),
  deps: z.array(TaskIdSchema),
  /** Rich text as HTML, edited in place in the task drawer. */
  desc: z.string(),
  estimate: z.string().nullable(),
  created: Ts,
  updated: Ts,
  order: z.number(),
  fav: z.boolean(),
  recur: RecurSchema.nullable(),
  completedAt: Ts.nullable().optional(),
  prevStatus: StatusSchema.optional(),
  archived: z.boolean().optional(),
  archivedAt: Ts.nullable().optional(),
});
export const ProjectSchema = z.object({
  id: ProjectIdSchema,
  key: z.string(),
  name: z.string(),
  icon: Icon,
  color: keyOf(PCOLORS),
  status: keyOf(PSTAT),
  team: TeamRef,
  lead: MemberIdSchema,
  due: IsoDate,
  start: IsoDate,
  fav: z.boolean(),
  members: z.array(MemberIdSchema),
  desc: z.string(),
  milestones: z.array(z.object({ name: z.string(), date: IsoDate })),
  /** Minutes since the last update, used by the seed's "updated" labels. */
  last: z.number(),
  private: z.boolean().optional(),
  archived: z.boolean().optional(),
  archivedAt: Ts.nullable().optional(),
  perms: z.record(MemberIdSchema, oneOf(PERMS)).optional(),
  access: z.enum(['private', 'workspace']).optional(),
  /** Last issued task number for `nextKey()`. */
  seq: z.number().optional(),
});
export const MemberSchema = z.object({
  id: MemberIdSchema,
  name: z.string(),
  email: z.string(),
  role: oneOf(ROLES),
  team: TeamRef,
  title: z.string(),
  c: z.string(),
  status: z.enum(['active', 'invited', 'deactivated']),
  /** Minutes since last seen; null for people who never signed in. */
  last: z.number().nullable(),
  tz: z.string(),
});
export const TeamSchema = z.object({ id: TeamIdSchema, name: z.string(), icon: Icon, c: z.string(), desc: z.string() });
export const CommentSchema = z.object({
  id: CommentIdSchema,
  task: TaskIdSchema,
  by: MemberIdSchema,
  at: Ts,
  text: z.string(),
  re: z.record(z.string(), z.array(MemberIdSchema)).default({}),
});
export const ActivitySchema = z.object({
  id: ActivityIdSchema,
  by: MemberIdSchema,
  verb: z.string(),
  task: TaskIdSchema.nullable(),
  project: ProjectIdSchema.nullable(),
  at: Ts,
  extra: z.string(),
});
export const NotifSchema = z.object({
  id: NotifIdSchema,
  type: z.enum(['mention', 'assign', 'comment', 'update']),
  by: MemberIdSchema.nullable(),
  task: TaskIdSchema.optional(),
  project: ProjectIdSchema.optional(),
  text: z.string(),
  snippet: z.string(),
  at: Ts,
  read: z.boolean(),
});
export const FileSchema = AttachmentSchema.extend({ project: ProjectIdSchema, task: TaskIdSchema.nullable().optional() });
export const EventSchema = z.object({ id: EventIdSchema, title: z.string(), date: IsoDate, time: z.string(), project: ProjectIdSchema });

export const FilterFieldSchema = z.enum(['status', 'assignee', 'priority', 'due', 'project', 'labels', 'created', 'updated']);
export const FilterSchema = z.object({ f: FilterFieldSchema, op: z.enum(['is', 'not']), v: z.array(z.string()) });
export const SavedViewSchema = z.object({
  id: ViewIdSchema,
  project: ProjectIdSchema,
  name: z.string(),
  type: z.enum(['list', 'board', 'table']),
  filters: z.array(FilterSchema),
});

export const DataSchema = z.object({
  ws: z.object({ name: z.string(), url: z.string(), c: z.string(), brand: z.boolean().optional() }),
  workspaces: z.array(z.object({ id: WorkspaceIdSchema, name: z.string(), c: z.string(), plan: oneOf(PLANS), brand: z.boolean().optional() })),
  me: MemberIdSchema,
  members: z.array(MemberSchema),
  projects: z.array(ProjectSchema),
  tasks: z.array(TaskSchema),
  comments: z.array(CommentSchema),
  activity: z.array(ActivitySchema),
  notifs: z.array(NotifSchema),
  files: z.array(FileSchema),
  events: z.array(EventSchema),
  projOrder: z.array(ProjectIdSchema),
  savedViews: z.array(SavedViewSchema),
  recentSearches: z.array(z.string()),
  sessions: z.array(z.object({ id: SessionIdSchema, dev: z.string(), loc: z.string(), at: z.string(), cur: z.boolean().optional() })),
  invoices: z.array(z.object({ id: z.string(), date: IsoDate, amt: z.string(), st: z.string() })),
  tfa: z.boolean(),
  notifPrefs: z.record(z.string(), z.boolean()),
  /** Older saves may not have teams: they were created on first use. */
  teams: z.array(TeamSchema).default(() => TEAMS_SEED.map(t => ({ ...t }))),
  plan: oneOf(PLANS).optional(),
});

export const SortFieldSchema = z.enum(['manual', 'title', 'due', 'start', 'priority', 'status', 'assignee', 'created', 'updated', 'estimate', 'project']);
export const GroupBySchema = z.enum(['status', 'priority', 'assignee', 'project', 'due', 'none']);
export const ViewSchema = z.object({
  filters: z.array(FilterSchema),
  sort: z.object({ f: SortFieldSchema, dir: z.union([z.literal(1), z.literal(-1)]) }),
  group: GroupBySchema,
  q: z.string(),
  /** Hidden table columns (`TCOLS` keys). */
  hidden: z.array(z.string()),
  /** Table column widths in px, by `TCOLS` key. */
  colW: z.record(z.string(), z.number()),
  showDone: z.boolean(),
  mode: z.enum(['list', 'board', 'table']).optional(),
});

/** Each preference falls back to its default on its own, so one bad value never resets the rest. */
export const PrefsSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).catch('system'),
  accent: z.enum(['indigo', 'blue', 'violet', 'teal', 'rose', 'graphite']).catch('indigo'),
  side: z.enum(['comfortable', 'compact']).catch('comfortable'),
  density: z.enum(['comfortable', 'compact']).catch('comfortable'),
  weekStart: z.coerce
    .number()
    .pipe(z.union([z.literal(0), z.literal(1), z.literal(6)]))
    .catch(1),
  dateFmt: oneOf(DATE_FORMATS).catch('MMM d'),
  lang: z.string().catch('English (US)'),
  tz: z.string().catch('(GMT-07:00) Pacific Time'),
  motion: z.enum(['system', 'reduce', 'full']).catch('system'),
  home: z.enum(['home', 'mytasks', 'inbox']).catch('home'),
  openTasks: z.enum(['drawer', 'full']).catch('drawer'),
  name: z.string().catch('Jerry Lucas'),
  title: z.string().catch('Head of Product'),
  defaultTab: z.enum(['board', 'list', 'table', 'overview', 'timeline']).optional().catch(undefined),
  timeFmt: z.enum(['12', '24']).optional().catch(undefined),
  showDoneBoard: z.boolean().optional().catch(undefined),
  confirmDel: z.boolean().optional().catch(undefined),
  spell: z.boolean().optional().catch(undefined),
  permCreate: z.boolean().optional().catch(undefined),
  permGuests: z.boolean().optional().catch(undefined),
  permPublic: z.boolean().optional().catch(undefined),
});

export type Subtask = z.infer<typeof SubtaskSchema>;
export type Attachment = z.infer<typeof AttachmentSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Member = z.infer<typeof MemberSchema>;
export type Team = z.infer<typeof TeamSchema>;
export type Comment = z.infer<typeof CommentSchema>;
export type Activity = z.infer<typeof ActivitySchema>;
export type Notif = z.infer<typeof NotifSchema>;
export type FileItem = z.infer<typeof FileSchema>;
export type CalEvent = z.infer<typeof EventSchema>;
export type Filter = z.infer<typeof FilterSchema>;
export type FilterField = z.infer<typeof FilterFieldSchema>;
export type SavedView = z.infer<typeof SavedViewSchema>;
export type Data = z.infer<typeof DataSchema>;
export type SortField = z.infer<typeof SortFieldSchema>;
export type GroupBy = z.infer<typeof GroupBySchema>;
export type View = z.infer<typeof ViewSchema>;
export type Prefs = z.infer<typeof PrefsSchema>;
export type Workspace = Data['workspaces'][number];
