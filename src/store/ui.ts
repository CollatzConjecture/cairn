/* Transient UI state. Never persisted except `collapsed`. Centrally hosted overlays (modals, the drawer, the palette) are unions here so the
   overlays area renders each variant exhaustively; popovers and menus keep their open state next to their triggers. */
import type { FileType, LabelId, Priority, ProjectColor, Recur, Status, TemplateId } from '../domain/constants';
import { TODAY, iso } from '../domain/date';
import { projectId, type MemberId, type NotifId, type ProjectId, type SubtaskId, type TaskId, type TeamId, type UploadId } from '../domain/ids';
import type { Attachment, Subtask, Task } from '../domain/schema';
import type { IconName } from '../ui/icon';

/** Keys into `views`: `p:<projectId>` project tabs, `sv:<viewId>` saved views, and the workspace pages. */
export type ViewKey = 'tasks' | 'mytasks' | 'my' | 'cal' | 'tl' | `p:${string}` | `sv:${string}`;

/** A task picker can edit a saved task or the open task form. */
export type TaskTarget = TaskId | 'form';

/** Confirm dialog body: plain text with optional bold runs. */
export type RichText = string | (string | { b: string })[];
export type ModalId = string & { readonly __modal: true };
export const modalId = (s: string) => s as ModalId;

export type Modal =
  | { type: 'task'; edit: TaskId | null }
  | { type: 'project'; edit: ProjectId | null }
  | { type: 'team'; edit: TeamId | null }
  | { type: 'share'; id: ProjectId }
  | { type: 'invite' }
  | { type: 'shortcuts' }
  | { type: 'saveView'; pid: ProjectId; nf: number }
  | { type: 'filePreview'; file: Attachment; tid: TaskId | null }
  /** Resolved through `confirm()`; the outcome is delivered to the awaiting caller, never stored. */
  | { type: 'confirm'; id: ModalId; title: string; body: RichText; ok: string; danger?: boolean; icon?: IconName; typeName?: string }
  /** Resolved through `prompt()`. */
  | { type: 'prompt'; id: ModalId; title: string; label: string; value: string; ok?: string };
export type ModalType = Modal['type'];

export type SearchScope = 'all' | 'tasks' | 'projects' | 'people' | 'files' | 'comments';
export type Palette = { mode: 'cmd' | 'search' | 'ws'; q: string; scope: SearchScope; hl: number };

/** Field values a new task inherits from where it was added (a list group, a board column, a calendar day). */
export type TaskSet = Partial<Pick<Task, 'status' | 'priority' | 'assignee' | 'project' | 'due'>>;
export type Composer = { ctx: ViewKey; group: string; gb: TaskSet };
export type EditCell = { id: TaskId; f: 'title' | 'estimate' };

export type TaskForm = {
  title: string;
  desc: string;
  project: ProjectId;
  status: Status;
  assignee: MemberId | null;
  priority: Priority;
  due: string | null;
  start: string | null;
  labels: LabelId[];
  subtasks: Subtask[];
  files: { name: string; size: string; type: FileType }[];
  recur: Recur | null;
  more: boolean;
};
export type ProjectForm = {
  name: string;
  desc: string;
  icon: IconName;
  color: ProjectColor;
  team: TeamId | null;
  lead: MemberId;
  due: string;
  tmpl: TemplateId;
};
export type TeamForm = { name: string; desc: string; icon: IconName; color: ProjectColor; members: MemberId[] };
export type OnbData = {
  use: string;
  team: 'kanban' | 'list' | 'timeline' | 'table';
  size: string;
  ws: string;
  url: string;
  urlTouched: boolean;
  proj: string;
  projTouched: boolean;
  tmpl: TemplateId;
  invites: string;
};

export type FormErrorKey = 'title' | 'pname' | 'pname2' | 'tname' | 'invite' | 'pwCur' | 'pwNew' | 'pwConf' | 'tfa' | 'email' | 'pw' | 'pw2' | 'name' | 'ws';
export type FormErrors = Partial<Record<FormErrorKey, string | null>>;

export type Upload = { id: UploadId; name: string; size: string; project: ProjectId; task: TaskId | null; pct: number };

/** One-shot motion flags read as `fx-*` classes. They expire on their own (src/store/store.ts), so re-renders never replay them. */
export type Fx = { done?: TaskId | SubtaskId; added?: TaskId | SubtaskId; moved?: TaskId };

export type Ui = {
  collapsed: boolean;
  mnav: boolean;
  expanded: Partial<Record<ProjectId, boolean>>;
  drawer: TaskId | null;
  drawerFull: boolean;
  drawerTab: 'comments' | 'activity';
  subOpen: { tid: TaskId; sid: SubtaskId } | null;
  modals: Modal[];
  palette: Palette | null;
  mention: { tid: TaskId; q: string } | null;
  loading: boolean;
  offline: boolean;
  /** Selected task rows in selection order (an array, not a Set, so the state stays JSON-serializable). */
  sel: TaskId[];
  composer: Composer | null;
  editCell: EditCell | null;
  openTasks: Partial<Record<TaskId, boolean>>;
  collapsedGroups: Partial<Record<string, boolean>>;
  collapsedCols: Partial<Record<string, true>>;
  calDate: string;
  calMode: 'month' | 'week';
  tlZoom: 'week' | 'month';
  tlGroup: 'status' | 'assignee' | 'project' | 'none';
  fileView: 'grid' | 'list';
  fileQ: string;
  fileType: string;
  fileSort: 'date' | 'name' | 'type';
  projView: 'grid' | 'list' | 'table';
  projQ: string;
  projStatus: string;
  projSort: 'recent' | 'name' | 'due' | 'progress';
  homeTab: 'upcoming' | 'overdue' | 'completed';
  inboxCat: 'all' | 'mention' | 'assign' | 'comment' | 'update';
  inboxUnread: boolean;
  inboxSel: NotifId | null;
  notifFilter: 'all' | 'unread';
  searchQ: string;
  searchCat: SearchScope;
  myView: 'list' | 'calendar';
  membersTab: 'members' | 'teams' | 'roles';
  memTab: 'assigned' | 'completed';
  memRole: string;
  memQ: string;
  actWho: string;
  actFilter: 'all' | 'status' | 'comments' | 'projects';
  archTab: 'tasks' | 'projects';
  errors: FormErrors;
  drafts: Partial<Record<TaskId, string>>;
  form: TaskForm | null;
  pform: ProjectForm | null;
  tform: TeamForm | null;
  confirmText: string;
  shareQ: string;
  inviteDraft: string;
  uploads: Upload[];
  fx: Fx;
  /** Auth and onboarding form state (the screen itself is the route). */
  af: { email: string; name: string };
  showPw: boolean;
  resendT: number;
  pwNew: string;
  pwDone: boolean;
  tfaSetup: boolean;
  onbData: OnbData;
};

export const initialUi = (collapsed = false): Ui => ({
  collapsed,
  mnav: false,
  expanded: { [projectId('p1')]: true },
  drawer: null,
  drawerFull: false,
  drawerTab: 'comments',
  subOpen: null,
  modals: [],
  palette: null,
  mention: null,
  loading: false,
  offline: false,
  sel: [],
  composer: null,
  editCell: null,
  openTasks: {},
  collapsedGroups: {},
  collapsedCols: {},
  calDate: iso(TODAY),
  calMode: 'month',
  tlZoom: 'week',
  tlGroup: 'status',
  fileView: 'grid',
  fileQ: '',
  fileType: 'all',
  fileSort: 'date',
  projView: 'grid',
  projQ: '',
  projStatus: 'all',
  projSort: 'recent',
  homeTab: 'upcoming',
  inboxCat: 'all',
  inboxUnread: false,
  inboxSel: null,
  notifFilter: 'all',
  searchQ: '',
  searchCat: 'all',
  myView: 'list',
  membersTab: 'members',
  memTab: 'assigned',
  memRole: 'all',
  memQ: '',
  actWho: 'all',
  actFilter: 'all',
  archTab: 'tasks',
  errors: {},
  drafts: {},
  form: null,
  pform: null,
  tform: null,
  confirmText: '',
  shareQ: '',
  inviteDraft: '',
  uploads: [],
  fx: {},
  af: { email: 'hello@example.com', name: '' },
  showPw: false,
  resendT: 0,
  pwNew: '',
  pwDone: false,
  tfaSetup: false,
  onbData: {
    use: 'product',
    team: 'kanban',
    size: '2-10',
    ws: '',
    url: '',
    urlTouched: false,
    proj: 'Website Launch',
    projTouched: false,
    tmpl: 'web',
    invites: '',
  },
});

/** Keys `setUi` writes: page tabs and segmented controls. */
export type SettableUiKey =
  | 'actFilter'
  | 'archTab'
  | 'calMode'
  | 'drawerTab'
  | 'fileView'
  | 'homeTab'
  | 'inboxCat'
  | 'inboxSel'
  | 'memRole'
  | 'memTab'
  | 'membersTab'
  | 'myView'
  | 'notifFilter'
  | 'projView'
  | 'searchCat'
  | 'tlZoom';
