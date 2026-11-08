import type { IconName } from '../ui/icon';
import { teamId, type TeamId } from './ids';

export const ST = {
  backlog: { id: 'backlog', name: 'Backlog' },
  todo: { id: 'todo', name: 'To Do' },
  progress: { id: 'progress', name: 'In Progress' },
  review: { id: 'review', name: 'Review' },
  done: { id: 'done', name: 'Done' },
} as const;
export type Status = keyof typeof ST;
export const STATUSES = Object.values(ST);

export const PR = {
  urgent: { id: 'urgent', name: 'Urgent', w: 4 },
  high: { id: 'high', name: 'High', w: 3 },
  medium: { id: 'medium', name: 'Medium', w: 2 },
  low: { id: 'low', name: 'Low', w: 1 },
  none: { id: 'none', name: 'No priority', w: 0 },
} as const;
export type Priority = keyof typeof PR;
export const PRIOS = Object.values(PR);

export const LB = {
  design: { id: 'design', name: 'Design', c: 'var(--violet)' },
  frontend: { id: 'frontend', name: 'Frontend', c: 'var(--blue)' },
  backend: { id: 'backend', name: 'Backend', c: 'var(--teal)' },
  research: { id: 'research', name: 'Research', c: 'var(--amber)' },
  content: { id: 'content', name: 'Content', c: 'var(--rose)' },
  bug: { id: 'bug', name: 'Bug', c: 'var(--red)' },
  qa: { id: 'qa', name: 'QA', c: 'var(--green)' },
  growth: { id: 'growth', name: 'Growth', c: 'var(--orange)' },
} as const;
export type LabelId = keyof typeof LB;
export const LABELS = Object.values(LB);

export const PSTAT = {
  planning: { name: 'Planning', c: 'var(--gray)' },
  active: { name: 'In Progress', c: 'var(--blue)' },
  risk: { name: 'At Risk', c: 'var(--red)' },
  hold: { name: 'On Hold', c: 'var(--amber)' },
  complete: { name: 'Completed', c: 'var(--green)' },
} as const;
export type ProjectStatus = keyof typeof PSTAT;

export const PCOLORS = {
  indigo: '#5A67D8',
  blue: '#3B82C4',
  violet: '#8662C9',
  teal: '#23918A',
  rose: '#C54B78',
  amber: '#C48A1E',
  green: '#3D8E5F',
  slate: '#6B7280',
} as const;
export type ProjectColor = keyof typeof PCOLORS;

/** Workspace colours offered in Settings. Onboarding gives a new workspace graphite, indigo, teal or rose in turn. */
export const WS_COLORS = {
  graphite: '#2F2E2A',
  indigo: '#5A67D8',
  blue: '#3B82C4',
  teal: '#23918A',
  rose: '#C54B78',
  amber: '#C48A1E',
} as const;

/** Avatar colours offered in Settings. */
export const AVATAR_COLORS = {
  indigo: '#5A67D8',
  rose: '#C54B78',
  blue: '#3B82C4',
  teal: '#23918A',
  amber: '#C48A1E',
  violet: '#8662C9',
} as const;

export const PICONS = [
  'globe',
  'smartphone',
  'megaphone',
  'rocket',
  'component',
  'building-2',
  'layout-grid',
  'palette',
  'code',
  'briefcase',
  'target',
  'layers',
  'zap',
  'heart',
  'folder',
  'sparkles',
] as const satisfies readonly IconName[];

export const ROLES = ['Owner', 'Admin', 'Member', 'Guest'] as const;
export type Role = (typeof ROLES)[number];

export const TEAMS_SEED = [
  { id: teamId('design'), name: 'Design', icon: 'palette', c: '#8662C9', desc: 'Product design, brand, and research' },
  { id: teamId('eng'), name: 'Engineering', icon: 'code', c: '#3B82C4', desc: 'Web, mobile, and platform engineering' },
  { id: teamId('mkt'), name: 'Marketing', icon: 'megaphone', c: '#C54B78', desc: 'Campaigns, content, and growth' },
  { id: teamId('product'), name: 'Product', icon: 'target', c: '#C48A1E', desc: 'Roadmap, planning, and QA' },
] as const satisfies readonly { id: TeamId; name: string; icon: IconName; c: string; desc: string }[];
export const NO_TEAM = { id: null, name: 'No team', icon: 'users', c: '#8A867E', desc: '' } as const satisfies {
  id: null;
  name: string;
  icon: IconName;
  c: string;
  desc: string;
};

export const RECURS = ['Daily', 'Weekly', 'Every 2 weeks', 'Monthly'] as const;
export type Recur = (typeof RECURS)[number];
export const RECUR_DAYS: Record<Recur, number> = { Daily: 1, Weekly: 7, 'Every 2 weeks': 14, Monthly: 30 };
export const ESTIMATES = ['30m', '1h', '2h', '4h', '1d', '2d', '3d', '5d', '8d'] as const;

export const PERMS = ['Can view', 'Can comment', 'Can edit', 'Full access'] as const;
export type Perm = (typeof PERMS)[number];
export const PLANS = ['Free', 'Team', 'Business'] as const;
export type Plan = (typeof PLANS)[number];

export const FT = {
  fig: { c: '#8662C9', i: 'pen-tool', n: 'Figma' },
  pdf: { c: '#C4473A', i: 'file-text', n: 'PDF' },
  zip: { c: '#6B7280', i: 'folder-archive', n: 'Archive' },
  img: { c: '#23918A', i: 'image', n: 'Image' },
  sheet: { c: '#3D8E5F', i: 'file-spreadsheet', n: 'Spreadsheet' },
  doc: { c: '#3B82C4', i: 'file-text', n: 'Document' },
  code: { c: '#C48A1E', i: 'file-code', n: 'Code' },
  other: { c: '#6B7280', i: 'file', n: 'File' },
} as const satisfies Record<string, { c: string; i: IconName; n: string }>;
export type FileType = keyof typeof FT;

export function fileType(name: string): FileType {
  const e = (name.split('.').pop() || '').toLowerCase();
  if (e === 'fig') return 'fig';
  if (e === 'pdf') return 'pdf';
  if (['zip', 'rar', '7z'].includes(e)) return 'zip';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic'].includes(e)) return 'img';
  if (['xlsx', 'xls', 'csv', 'numbers'].includes(e)) return 'sheet';
  if (['doc', 'docx', 'txt', 'md', 'pages', 'rtf'].includes(e)) return 'doc';
  if (['js', 'ts', 'json', 'html', 'css', 'py'].includes(e)) return 'code';
  return 'other';
}
export function fsize(b: number) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return Math.round(b / 1024) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

export const PTABS = [
  ['overview', 'Overview', 'layout-dashboard'],
  ['board', 'Board', 'square-kanban'],
  ['list', 'List', 'list'],
  ['table', 'Table', 'table-2'],
  ['calendar', 'Calendar', 'calendar'],
  ['timeline', 'Timeline', 'chart-gantt'],
  ['files', 'Files', 'paperclip'],
  ['activity', 'Activity', 'activity'],
] as const satisfies readonly (readonly [string, string, IconName])[];
export type ProjectTabKey = (typeof PTABS)[number][0];

/** Table view columns: key, header, default width in px. */
export const TCOLS = [
  ['title', 'Task', 314],
  ['status', 'Status', 132],
  ['priority', 'Priority', 112],
  ['assignee', 'Assignee', 156],
  ['due', 'Due date', 112],
  ['start', 'Start date', 112],
  ['labels', 'Labels', 180],
  ['deps', 'Dependencies', 150],
  ['estimate', 'Estimate', 92],
  ['created', 'Created', 112],
  ['project', 'Project', 156],
] as const;
export type TableColumn = (typeof TCOLS)[number][0];

export const TEMPLATES = [
  { id: 'blank', name: 'Blank project', icon: 'file', desc: 'Start from scratch', tasks: [] },
  {
    id: 'product',
    name: 'Product Development',
    icon: 'target',
    desc: 'Discovery to launch',
    tasks: ['Define problem statement', 'User research plan', 'Write PRD', 'Design exploration', 'Build MVP', 'Beta launch'],
  },
  {
    id: 'web',
    name: 'Website',
    icon: 'globe',
    desc: 'IA, design, build, launch',
    tasks: ['Sitemap & information architecture', 'Wireframes', 'Visual design', 'Build page templates', 'Content migration', 'QA & launch'],
  },
  {
    id: 'mkt',
    name: 'Marketing Campaign',
    icon: 'megaphone',
    desc: 'Brief, assets, channels',
    tasks: ['Campaign brief', 'Audience research', 'Creative assets', 'Channel plan', 'Launch campaign', 'Performance report'],
  },
  {
    id: 'design',
    name: 'Design Project',
    icon: 'palette',
    desc: 'Discovery to handoff',
    tasks: ['Discovery workshop', 'Moodboard', 'Concept directions', 'Refinement', 'Developer handoff'],
  },
  {
    id: 'software',
    name: 'Software Development',
    icon: 'code',
    desc: 'Spec, build, ship',
    tasks: ['Technical spec', 'Set up repo & CI', 'Implement core API', 'Write tests', 'Code review', 'Deploy to staging'],
  },
  {
    id: 'personal',
    name: 'Personal Project',
    icon: 'heart',
    desc: 'Plan your own goals',
    tasks: ['Brain dump ideas', 'Pick top 3 priorities', 'Schedule focus time', 'Weekly review'],
  },
] as const satisfies readonly { id: string; name: string; icon: IconName; desc: string; tasks: readonly string[] }[];
export type TemplateId = (typeof TEMPLATES)[number]['id'];

export const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const MOD = isMac ? '⌘' : 'Ctrl';

export const SHORTCUTS: readonly (readonly [string, readonly (readonly [string, readonly string[]])[]])[] = [
  [
    'General',
    [
      ['Command menu', [MOD, 'K']],
      ['Search', ['/']],
      ['Keyboard shortcuts', ['?']],
      ['Toggle sidebar', ['[']],
      ['Toggle dark mode', [MOD, 'Shift', 'L']],
      ['Close panel or dialog', ['Esc']],
    ],
  ],
  [
    'Create',
    [
      ['New task', ['N']],
      ['New project', ['P']],
      ['Submit form', [MOD, '↵']],
      ['Send comment', [MOD, '↵']],
    ],
  ],
  [
    'Navigate',
    [
      ['Go to Home', ['G', 'H']],
      ['Go to My Tasks', ['G', 'T']],
      ['Go to Projects', ['G', 'P']],
      ['Go to Inbox', ['G', 'I']],
      ['Go to Calendar', ['G', 'C']],
      ['Go to Settings', ['G', 'S']],
    ],
  ],
  [
    'Command menu',
    [
      ['Move selection', ['↑', '↓']],
      ['Run command', ['↵']],
      ['Search mode', ['Tab']],
    ],
  ],
];
