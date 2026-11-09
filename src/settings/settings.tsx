/* Settings: a section nav and one section per route `/settings/<sec>`. Preferences apply as soon as they
   change (the shell re-themes from the store) and persist with the store. */
import type { ComponentType } from 'react';
import {
  AtSign,
  BuildingComplex,
  Clock,
  CreditCard,
  Ellipsis,
  FolderKanban,
  Gem,
  Keyboard,
  KeyRound,
  Languages,
  Mail,
  MonitorSmartphone,
  Palette,
  Receipt,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  User,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
  Archive,
  CircleCheck,
  Monitor,
  Moon,
  Sun,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';
import { SHORTCUTS } from '../domain/constants';
import { DATE_FORMATS, dOff, fmtDate, type DateFormat } from '../domain/date';
import type { Prefs } from '../domain/schema';
import { MemberMenu } from '../pages/menus';
import { RoleCell } from '../pages/members';
import { PermsTable } from '../pages/perms-table';
import { TeamsGrid } from '../pages/teams-grid';
import { Page404 } from '../shell/errors';
import { linkTo } from '../shell/shell';
import { delProject, invite, restoreProject, set, setTheme, toast, useStore } from '../store';
import { Avatar, ProjectIcon } from '../ui/helpers';
import { Panel, Seg, SelectField, Swatches, type Option } from '../pages/kit';
import { Invoices, Payment, Plan, Password, Profile, Sessions, TwoFactor, Workspace } from './account';
import { SBlock, SRow, SectionHead, ToggleRow } from './parts';

type Icon = ComponentType<{ className?: string }>;
type Sec = { key: string; name: string; icon: Icon };
const NAV: readonly [string, readonly Sec[]][] = [
  [
    'General',
    [
      { key: 'workspace', name: 'Workspace', icon: BuildingComplex },
      { key: 'appearance', name: 'Appearance', icon: Palette },
      { key: 'language', name: 'Language', icon: Languages },
      { key: 'datetime', name: 'Date & time', icon: Clock },
    ],
  ],
  [
    'Workspace',
    [
      { key: 'members', name: 'Members', icon: Users },
      { key: 'teams', name: 'Teams', icon: UsersRound },
      { key: 'projects', name: 'Projects', icon: FolderKanban },
      { key: 'permissions', name: 'Permissions', icon: Shield },
    ],
  ],
  [
    'Notifications',
    [
      { key: 'notif-email', name: 'Email', icon: Mail },
      { key: 'notif-push', name: 'Push', icon: Smartphone },
      { key: 'notif-mentions', name: 'Mentions', icon: AtSign },
      { key: 'notif-assign', name: 'Task assignments', icon: UserCheck },
    ],
  ],
  [
    'Personal',
    [
      { key: 'profile', name: 'Profile', icon: User },
      { key: 'preferences', name: 'Preferences', icon: SlidersHorizontal },
      { key: 'shortcuts', name: 'Keyboard shortcuts', icon: Keyboard },
    ],
  ],
  [
    'Security',
    [
      { key: 'password', name: 'Password', icon: KeyRound },
      { key: 'sessions', name: 'Sessions', icon: MonitorSmartphone },
      { key: '2fa', name: 'Two-factor authentication', icon: ShieldCheck },
    ],
  ],
  [
    'Billing',
    [
      { key: 'plan', name: 'Plan', icon: Gem },
      { key: 'payment', name: 'Payment', icon: CreditCard },
      { key: 'invoices', name: 'Invoices', icon: Receipt },
    ],
  ],
];

/* ---------- preference writers ---------- */
function setPref<K extends keyof Prefs>(k: K, v: Prefs[K], saved = true) {
  set(s => {
    s.prefs[k] = v;
  });
  if (saved) toast('Preference saved', { ms: 1500 });
}
function setNotif(k: string, v: boolean) {
  set(s => {
    s.data.notifPrefs[k] = v;
  });
  toast('Notification preferences saved', { ms: 1500 });
}
const cap = (s: string) => s[0]?.toUpperCase() + s.slice(1);
/** A select over string options that also shows a stored value the list does not have. */
const withValue = (opts: Option<string>[], v: string) => (opts.some(o => o.value === v) ? opts : [{ value: v, label: v }, ...opts]);

/* ---------- Appearance ---------- */
const bar = 'block h-1.25 rounded-[3px]';
function Preview({ dark }: { dark: boolean }) {
  // The light preview draws with white/black alphas so it stays light while the app is dark; the dark one scopes the real dark palette.
  return dark ? (
    <div className="dark grid h-full grid-cols-[30%_1fr] bg-background">
      <div className="flex flex-col gap-1 bg-sidebar px-1.5 py-2">
        <i className={cn(bar, 'w-[70%] bg-border')} />
        <i className={cn(bar, 'w-[55%] bg-primary')} />
        <i className={cn(bar, 'w-4/5 bg-border')} />
        <i className={cn(bar, 'w-3/5 bg-border')} />
      </div>
      <div className="flex flex-col gap-1.25 p-2.5">
        <i className={cn(bar, 'h-1.75 w-[45%] bg-foreground')} />
        <i className={cn(bar, 'bg-border')} />
        <i className={cn(bar, 'w-4/5 bg-border')} />
        <i className={cn(bar, 'mt-1 h-2.5 w-[30%] bg-primary')} />
      </div>
    </div>
  ) : (
    <div className="grid h-full grid-cols-[30%_1fr] bg-white">
      <div className="flex flex-col gap-1 bg-black/5 px-1.5 py-2">
        <i className={cn(bar, 'w-[70%] bg-black/10')} />
        <i className={cn(bar, 'w-[55%] bg-(--acc-l)')} />
        <i className={cn(bar, 'w-4/5 bg-black/10')} />
        <i className={cn(bar, 'w-3/5 bg-black/10')} />
      </div>
      <div className="flex flex-col gap-1.25 p-2.5">
        <i className={cn(bar, 'h-1.75 w-[45%] bg-black/88')} />
        <i className={cn(bar, 'bg-black/10')} />
        <i className={cn(bar, 'w-4/5 bg-black/10')} />
        <i className={cn(bar, 'mt-1 h-2.5 w-[30%] bg-(--acc-l)')} />
      </div>
    </div>
  );
}
const THEMES = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;
const ACCENTS = ['indigo', 'blue', 'violet', 'teal', 'rose', 'graphite'] as const;
const DENSITY = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
] as const;

function Appearance() {
  const p = useStore(s => s.prefs);
  return (
    <>
      <SBlock title="Theme" className="mt-0">
        <div className="mt-3 grid grid-cols-3 gap-3 max-sm:grid-cols-1" role="radiogroup" aria-label="Theme">
          {THEMES.map(({ value: k, label, icon: I }) => {
            const on = p.theme === k;
            return (
              <button
                key={k}
                role="radio"
                aria-checked={on}
                className={cn(
                  'flex flex-col gap-2 rounded-xl border p-2 text-left transition-[border-color,box-shadow,transform] hover:border-input active:scale-98',
                  on && 'border-primary ring-3 ring-primary-soft hover:border-primary',
                )}
                onClick={() => setTheme(k)}
              >
                <div className="h-21 overflow-hidden rounded-md border border-gray/20">
                  {k === 'system' ? (
                    <div className="grid h-full grid-cols-2">
                      <Preview dark={false} />
                      <Preview dark />
                    </div>
                  ) : (
                    <Preview dark={k === 'dark'} />
                  )}
                </div>
                <span className="flex items-center gap-1.5 text-[13px] font-medium [&_svg]:size-3.5">
                  <I />
                  {label}
                  {on && <CircleCheck className="ml-auto size-3.75! text-primary" />}
                </span>
              </button>
            );
          })}
        </div>
      </SBlock>
      <SBlock title="Accent color">
        <SRow title="Accent" desc="Used for primary buttons, focus rings, and selection.">
          <Swatches
            label="Accent color"
            size="size-6.5"
            value={p.accent}
            onChange={v => setPref('accent', v, false)}
            options={ACCENTS.map(k => ({ value: k, c: 'var(--acc-l)', label: cap(k) }))}
            accentScope
          />
        </SRow>
      </SBlock>
      <SBlock title="Density">
        <SRow title="Sidebar density" desc="Compact fits more projects on screen.">
          <Seg label="Sidebar density" value={p.side} onChange={v => setPref('side', v, false)} items={DENSITY} />
        </SRow>
        <SRow title="Task display" desc="Row height in lists and card padding on boards.">
          <Seg label="Task display" value={p.density} onChange={v => setPref('density', v, false)} items={DENSITY} />
        </SRow>
        <SRow title="Motion" desc="Reduce animations for drawers, modals, and transitions.">
          <SelectField
            label="Motion"
            className="min-w-45"
            value={p.motion}
            onChange={v => setPref('motion', v)}
            options={[
              { value: 'system', label: 'Follow system' },
              { value: 'reduce', label: 'Reduce motion' },
              { value: 'full', label: 'Full motion' },
            ]}
          />
        </SRow>
      </SBlock>
    </>
  );
}

/* ---------- Language, Date & time ---------- */
const LANGS = ['English (US)', 'English (UK)', 'Deutsch', 'Español', 'Français', '日本語'].map(v => ({ value: v, label: v }));
const TZS = ['(GMT-07:00) Pacific Time', '(GMT-05:00) Eastern Time', '(GMT+00:00) London', '(GMT+01:00) Berlin', '(GMT+08:00) Singapore'].map(v => ({
  value: v,
  label: v,
}));
const DATE_LABELS: Record<DateFormat, string> = { 'MMM d': 'Oct 1', 'd/M': '1/10', 'M/d': '10/1', 'yyyy-MM-dd': '2026-10-01' };
const WEEK = [
  { value: '1', label: 'Monday', n: 1 },
  { value: '0', label: 'Sunday', n: 0 },
  { value: '6', label: 'Saturday', n: 6 },
] as const;

function Language() {
  const p = useStore(s => s.prefs);
  return (
    <>
      <SRow title="Language" desc="The language used throughout the interface.">
        <SelectField label="Language" className="min-w-45" value={p.lang} onChange={v => setPref('lang', v)} options={withValue(LANGS, p.lang)} />
      </SRow>
      <ToggleRow
        title="Spellcheck"
        desc="Check spelling in descriptions and comments."
        checked={p.spell !== false}
        onChange={v => setPref('spell', v, false)}
      />
    </>
  );
}
function DateTime() {
  const p = useStore(s => s.prefs);
  return (
    <>
      <SRow title="Time zone" desc="Used for due dates and reminders.">
        <SelectField label="Time zone" className="min-w-45" value={p.tz} onChange={v => setPref('tz', v)} options={withValue(TZS, p.tz)} />
      </SRow>
      <SRow
        title="Date format"
        desc={
          <>
            Preview: <b className="font-semibold">{fmtDate(dOff(8))}</b>
          </>
        }
      >
        <SelectField
          label="Date format"
          className="min-w-45"
          value={p.dateFmt}
          onChange={v => setPref('dateFmt', v)}
          options={DATE_FORMATS.map(f => ({ value: f, label: DATE_LABELS[f] }))}
        />
      </SRow>
      <SRow title="Start week on" desc="Affects calendars and the timeline.">
        <SelectField
          label="Start week on"
          className="min-w-45"
          value={String(p.weekStart)}
          onChange={v => {
            const w = WEEK.find(x => x.value === v);
            if (w) setPref('weekStart', w.n);
          }}
          options={WEEK}
        />
      </SRow>
      <SRow title="Time format">
        <SelectField
          label="Time format"
          className="min-w-45"
          value={p.timeFmt ?? '12'}
          onChange={v => setPref('timeFmt', v)}
          options={[
            { value: '12', label: '12-hour (2:30 PM)' },
            { value: '24', label: '24-hour (14:30)' },
          ]}
        />
      </SRow>
    </>
  );
}

/* ---------- Workspace sections ---------- */
function Members() {
  const d = useStore(s => s.data);
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <Button onClick={invite}>
          <UserPlus />
          Invite member
        </Button>
        <Button variant="outline" nativeButton={false} render={<a {...linkTo({ r: 'members' })} />}>
          Open member directory
        </Button>
      </div>
      <Panel>
        {d.members.map(m => (
          <div key={m.id} className="flex min-h-13 items-center gap-2.5 px-3.5 not-first:border-t not-first:border-divider">
            <Avatar id={m.id} size="md" tip={false} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{m.name}</div>
              <div className="truncate text-xs text-muted-foreground">{m.email}</div>
            </div>
            {m.status === 'invited' && <Badge className="rounded-[5px] bg-amber/12 text-amber">Invited</Badge>}
            <RoleCell m={m} canEdit />
            <MemberMenu id={m.id}>
              <Button variant="ghost" size="icon-sm" aria-label={`Options for ${m.name}`}>
                <Ellipsis />
              </Button>
            </MemberMenu>
          </div>
        ))}
      </Panel>
    </>
  );
}
function Projects() {
  const p = useStore(s => s.prefs);
  const arch = useStore(s => s.data.projects).filter(x => x.archived);
  return (
    <>
      <SRow title="Default project view" desc="The tab that opens when you open a project.">
        <SelectField
          label="Default project view"
          className="min-w-45"
          value={p.defaultTab ?? 'board'}
          onChange={v => setPref('defaultTab', v)}
          options={[
            { value: 'board', label: 'Board' },
            { value: 'list', label: 'List' },
            { value: 'table', label: 'Table' },
            { value: 'overview', label: 'Overview' },
            { value: 'timeline', label: 'Timeline' },
          ]}
        />
      </SRow>
      <ToggleRow title="Show completed tasks on boards" checked={p.showDoneBoard !== false} onChange={v => setPref('showDoneBoard', v, false)} />
      <SBlock title="Archived projects">
        {arch.length ? (
          arch.map(x => (
            <SRow
              key={x.id}
              title={
                <span className="flex items-center gap-2">
                  <ProjectIcon p={x} />
                  {x.name}
                </span>
              }
            >
              <Button variant="outline" size="sm" onClick={() => restoreProject(x.id)} aria-label={`Restore ${x.name}`}>
                Restore
              </Button>
              <Button variant="destructive" size="sm" onClick={() => void delProject(x.id)} aria-label={`Delete ${x.name}`}>
                Delete
              </Button>
            </SRow>
          ))
        ) : (
          <p className="py-3 text-muted-foreground">No archived projects. Archived projects are hidden from the sidebar but keep all their tasks.</p>
        )}
        <Button variant="outline" size="sm" className="mt-3" nativeButton={false} render={<a {...linkTo({ r: 'archive' })} />}>
          <Archive />
          Open archive
        </Button>
      </SBlock>
    </>
  );
}
function Permissions() {
  const p = useStore(s => s.prefs);
  return (
    <>
      <ToggleRow title="Members can create projects" checked={p.permCreate !== false} onChange={v => setPref('permCreate', v, false)} />
      <ToggleRow
        title="Members can invite guests"
        desc="Guests only see projects they are added to."
        checked={p.permGuests !== false}
        onChange={v => setPref('permGuests', v, false)}
      />
      <ToggleRow
        title="Allow public share links"
        desc="Anyone with the link can view a project."
        checked={!!p.permPublic}
        onChange={v => setPref('permPublic', v, false)}
      />
      <SBlock title="Role permissions">
        <div className="mt-3">
          <PermsTable />
        </div>
      </SBlock>
    </>
  );
}

/* ---------- Notifications ---------- */
type NotifRow = [key: string, title: string, desc: string, dflt: boolean];
const NOTIFS: Record<string, NotifRow[]> = {
  'notif-email': [
    ['email_mention', 'Mentions', 'When someone @mentions you.', false],
    ['email_assign', 'Assignments', 'When a task is assigned to you.', false],
    ['email_comment', 'Comments', 'On tasks you created or are assigned.', false],
    ['email_digest', 'Daily digest', 'A summary of what changed, every weekday at 8:00.', false],
  ],
  'notif-push': [
    ['push_mention', 'Mentions', '', false],
    ['push_assign', 'Assignments', '', false],
    ['push_comment', 'Comments', '', false],
    ['push_due', 'Due date reminders', 'One day before a task is due.', false],
  ],
  'notif-mentions': [
    ['mention_all', '@mentions in comments and descriptions', '', false],
    ['mention_team', '@team mentions', 'When your team is mentioned, e.g. @Product.', true],
    ['mention_ws', '@workspace mentions', 'Announcements to everyone.', false],
  ],
  'notif-assign': [
    ['assign_self', "When I'm assigned a task", '', false],
    ['assign_status', 'When my task changes status', '', true],
    ['assign_over', 'When my task is overdue', '', true],
  ],
};
function Notifs({ rows }: { rows: NotifRow[] }) {
  const np = useStore(s => s.data.notifPrefs);
  return rows.map(([k, title, desc, dflt]) => (
    <ToggleRow key={k} title={title} desc={desc || undefined} checked={np[k] ?? dflt} onChange={v => setNotif(k, v)} />
  ));
}

/* ---------- Personal ---------- */
function Preferences() {
  const p = useStore(s => s.prefs);
  return (
    <>
      <SRow title="Open on launch" desc="The page you see when Cairn opens.">
        <SelectField
          label="Open on launch"
          className="min-w-45"
          value={p.home}
          onChange={v => setPref('home', v)}
          options={[
            { value: 'home', label: 'Home' },
            { value: 'mytasks', label: 'My Tasks' },
            { value: 'inbox', label: 'Inbox' },
          ]}
        />
      </SRow>
      <SRow title="Open tasks in" desc="Side panel keeps your place in the list.">
        <SelectField
          label="Open tasks in"
          className="min-w-45"
          value={p.openTasks}
          onChange={v => setPref('openTasks', v)}
          options={[
            { value: 'drawer', label: 'Side panel' },
            { value: 'full', label: 'Full page' },
          ]}
        />
      </SRow>
      <ToggleRow title="Confirm before deleting tasks" checked={p.confirmDel !== false} onChange={v => setPref('confirmDel', v, false)} />
    </>
  );
}
function Shortcuts() {
  return SHORTCUTS.map(([g, list]) => (
    <SBlock key={g} title={g} className="mt-4.5">
      {list.map(([n, keys]) => (
        <div key={n} className="flex items-center justify-between border-b border-divider py-2.25">
          <span>{n}</span>
          <span className="flex items-center gap-1">
            {keys.map((k, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && keys[0] === 'G' && <span className="text-2xs text-muted-foreground">then</span>}
                <Kbd>{k}</Kbd>
              </span>
            ))}
          </span>
        </div>
      ))}
    </SBlock>
  ));
}

/** Each section: its lead line and body. Titles come from the nav. */
const SECTIONS: Record<string, { lead: (d: { members: number; ws: string }) => string; Body: ComponentType }> = {
  workspace: { lead: () => 'Your workspace name, address, and identity.', Body: Workspace },
  appearance: { lead: () => 'Customize how Cairn looks on this device.', Body: Appearance },
  language: { lead: () => 'Language and regional formats.', Body: Language },
  datetime: { lead: () => 'How dates and times appear across the workspace.', Body: DateTime },
  members: { lead: c => `${c.members} people have access to ${c.ws}.`, Body: Members },
  teams: { lead: () => 'Teams group people and projects.', Body: TeamsGrid },
  projects: { lead: () => 'Defaults for new projects and archived work.', Body: Projects },
  permissions: { lead: () => 'Control what each role can do.', Body: Permissions },
  'notif-email': { lead: () => 'Choose which emails you receive.', Body: () => <Notifs rows={NOTIFS['notif-email'] ?? []} /> },
  'notif-push': { lead: () => 'Notifications on desktop and mobile.', Body: () => <Notifs rows={NOTIFS['notif-push'] ?? []} /> },
  'notif-mentions': { lead: () => 'Decide which mentions reach you.', Body: () => <Notifs rows={NOTIFS['notif-mentions'] ?? []} /> },
  'notif-assign': { lead: () => 'Updates about tasks assigned to you.', Body: () => <Notifs rows={NOTIFS['notif-assign'] ?? []} /> },
  profile: { lead: () => 'How you appear to others in the workspace.', Body: Profile },
  preferences: { lead: () => 'Personal defaults for how you work.', Body: Preferences },
  shortcuts: { lead: () => 'Move faster with the keyboard.', Body: Shortcuts },
  password: { lead: () => "Use a long password you don't use anywhere else.", Body: Password },
  sessions: { lead: () => 'Devices currently signed in to your account.', Body: Sessions },
  '2fa': { lead: () => 'Add a second step when signing in.', Body: TwoFactor },
  plan: { lead: () => 'Your subscription and usage.', Body: Plan },
  payment: { lead: () => 'Payment method and billing details.', Body: Payment },
  invoices: { lead: () => 'Past invoices for this workspace.', Body: Invoices },
};

const navItem =
  'flex h-7.5 shrink-0 items-center gap-2 rounded-md px-2 text-base whitespace-nowrap text-fg-2 transition-colors hover:bg-muted hover:text-foreground aria-[current=page]:bg-background aria-[current=page]:text-foreground aria-[current=page]:shadow-sidebar-active [&_svg]:size-3.75 [&_svg]:text-fg-4 aria-[current=page]:[&_svg]:text-fg-2';

export function SettingsPage({ sec }: { sec: string }) {
  const members = useStore(s => s.data.members.length);
  const ws = useStore(s => s.data.ws.name);
  const item = NAV.flatMap(([, xs]) => xs).find(x => x.key === sec);
  const S = SECTIONS[sec];
  return (
    <div className="grid h-full grid-cols-[220px_minmax(0,1fr)] max-md:grid-cols-1 max-md:grid-rows-[auto_minmax(0,1fr)]">
      <nav
        className="overflow-y-auto border-r bg-background px-2.5 py-5 max-md:flex max-md:gap-1 max-md:overflow-x-auto max-md:border-r-0 max-md:border-b max-md:px-3 max-md:py-2"
        aria-label="Settings"
      >
        {NAV.map(([g, xs], i) => (
          <div key={g} className="max-md:contents">
            <div className={cn('px-2 pb-1 text-2xs font-semibold tracking-[0.06em] text-muted-foreground uppercase max-md:hidden', i ? 'pt-3.5' : 'pt-0')}>
              {g}
            </div>
            {xs.map(x => (
              <a key={x.key} {...linkTo({ r: 'settings', sec: x.key })} className={navItem} aria-current={x.key === sec ? 'page' : undefined}>
                <x.icon />
                {x.name}
              </a>
            ))}
          </div>
        ))}
      </nav>
      <div className="overflow-y-auto">
        {item && S ? (
          <div className="max-w-180 px-10 pt-8 pb-20 max-md:px-4 max-md:pt-5 max-md:pb-24">
            <SectionHead title={item.name} lead={S.lead({ members, ws })} />
            <S.Body />
          </div>
        ) : (
          <Page404 />
        )}
      </div>
    </div>
  );
}
