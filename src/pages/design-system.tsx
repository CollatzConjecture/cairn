/* The design system page: a live gallery of the shadcn-based components and Cairn tokens the app is built from. */
import type { ReactNode } from 'react';
import {
  Activity,
  Archive,
  ArrowUpDown,
  AtSign,
  Bell,
  Calendar,
  ChartGantt,
  CircleAlert,
  CircleCheck,
  CircleDot,
  Copy,
  Ellipsis,
  Eye,
  FolderKanban,
  GitBranch,
  House,
  Inbox,
  Info,
  LayoutGrid,
  Link,
  List,
  ListChecks,
  ListFilter,
  Lock,
  MessageSquare,
  Monitor,
  Moon,
  Paperclip,
  Pencil,
  Plus,
  Repeat,
  Rows3,
  Search,
  Settings,
  Share2,
  Star,
  Sun,
  Table2,
  Tag as TagIcon,
  Timer,
  Trash,
  TriangleAlert,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Kbd } from '@/components/ui/kbd';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SidebarMenu } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { MiniRow } from '../components/task-list';
import { LABELS, PRIOS, STATUSES } from '../domain/constants';
import { dOff } from '../domain/date';
import { memberId, taskId } from '../domain/ids';
import { KanbanCard } from '../project/kanban-card';
import { NavItem } from '../shell/shell';
import { allTasks, confirm, newTask, openPalette, openTask, setTheme, taskById, toast, useStore } from '../store';
import { Avatar, AvatarStack, Label as TaskLabel, PriorityPill, ProgressBar, ProjectStatusBadge, StatusPill, Tag, Tip } from '../ui/helpers';
import { Callout, Page, PageHeader, Panel, Seg, barTone } from './kit';

function Sec({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="mt-9 first-of-type:mt-2" aria-label={title}>
      <h2 className="mb-3 flex items-baseline gap-2.5 text-md font-semibold">
        {title}
        {note && <span className="text-xs font-normal text-muted-foreground">{note}</span>}
      </h2>
      {children}
    </section>
  );
}
const Row = ({ lab, children, className }: { lab?: string; children: ReactNode; className?: string }) => (
  <div className={cn('mb-2.5 flex flex-wrap items-center gap-2.5 rounded-lg border p-3', className)}>
    {lab && <span className="w-22.5 shrink-0 text-xs text-muted-foreground">{lab}</span>}
    {children}
  </div>
);

const TOKENS: [string, string][] = [
  ['Canvas', 'canvas'],
  ['Sidebar', 'sidebar'],
  ['Background', 'background'],
  ['Muted', 'muted'],
  ['Muted strong', 'muted-strong'],
  ['Border', 'border'],
  ['Input', 'input'],
  ['Foreground', 'foreground'],
  ['Foreground 2', 'fg-2'],
  ['Muted foreground', 'muted-foreground'],
  ['Primary', 'primary'],
  ['Green', 'green'],
  ['Amber', 'amber'],
  ['Red', 'red'],
];
const TYPE: [string, string, string][] = [
  ['Page title', 'text-2xl font-semibold', 'Website Redesign'],
  ['Section title', 'text-xl font-semibold', 'Upcoming deadlines'],
  ['Subsection', 'text-md font-semibold', 'Subtasks'],
  ['Body', 'text-base', 'Low-fidelity wireframes for the new homepage.'],
  ['Secondary', 'text-sm text-fg-2', 'Updated 38 minutes ago'],
  ['Metadata', 'text-xs font-medium text-fg-2', 'WEB-109 · Due tomorrow'],
  ['Label', 'text-2xs font-semibold tracking-[0.06em] text-muted-foreground uppercase', 'Workspace'],
];
const ICONS = [
  House,
  Inbox,
  CircleCheck,
  Star,
  Search,
  Bell,
  FolderKanban,
  ListChecks,
  Calendar,
  ChartGantt,
  Users,
  Activity,
  Settings,
  Plus,
  ListFilter,
  ArrowUpDown,
  Rows3,
  Share2,
  Ellipsis,
  Paperclip,
  MessageSquare,
  TagIcon,
  Link,
  Copy,
  Pencil,
  Trash,
  Archive,
  Upload,
  Repeat,
  Timer,
  GitBranch,
  Lock,
  Eye,
  AtSign,
  Sun,
  Moon,
];

function demoToast(kind: 'ok' | 'err') {
  if (kind === 'err') toast("Your changes couldn't be saved.", { kind: 'err', action: 'Try again', onAction: () => toast('Saved') });
  else toast('Moved “Create homepage wireframes” to Review', { action: 'Undo', onAction: () => toast('Undone', { kind: 'info' }) });
}
async function demoConfirm() {
  const ok = await confirm({
    title: 'Archive Marketing Website?',
    body: 'The project will be hidden from the sidebar. You can restore it any time.',
    ok: 'Archive project',
    icon: 'archive',
  });
  if (ok) toast('This was a preview — nothing was archived', { kind: 'info' });
}

export function DesignSystemPage() {
  const d = useStore(s => s.data);
  const theme = useStore(s => s.prefs.theme);
  const card = taskById(d, taskId('t3')) ?? allTasks(d)[0];
  return (
    <Page>
      <PageHeader title="Design system" sub="Tokens and components that make up Cairn. Switch themes to see both palettes.">
        <Seg
          label="Theme"
          value={theme}
          onChange={setTheme}
          items={[
            { value: 'light', label: 'Light', icon: <Sun /> },
            { value: 'dark', label: 'Dark', icon: <Moon /> },
            { value: 'system', label: 'System', icon: <Monitor /> },
          ]}
        />
      </PageHeader>

      <Sec title="Color" note="Theme tokens, redefined per theme">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
          {TOKENS.map(([n, v]) => (
            <div key={v} className="overflow-hidden rounded-lg border text-xs">
              <div className="h-11 border-b bg-(--c)" style={{ '--c': `var(--${v})` }} />
              <div className="flex flex-col px-2 py-1.5">
                <span>{n}</span>
                <code className="font-mono text-2xs text-muted-foreground">{v}</code>
              </div>
            </div>
          ))}
        </div>
      </Sec>

      <Sec title="Status & priority" note="Always paired with text or a tooltip">
        <Row>
          {STATUSES.map(s => (
            <span key={s.id} className="inline-flex h-6.5 items-center gap-1.5 rounded-md border px-2 text-sm">
              <StatusPill st={s.id} />
            </span>
          ))}
        </Row>
        <Row>
          {PRIOS.map(p => (
            <span key={p.id} className="inline-flex h-6.5 items-center gap-1.5 rounded-md border px-2 text-sm">
              <PriorityPill p={p.id} />
            </span>
          ))}
        </Row>
        <Row>
          {LABELS.map(l => (
            <TaskLabel key={l.id} id={l.id} />
          ))}
        </Row>
      </Sec>

      <Sec title="Typography" note="Geist · Geist Mono">
        <Panel className="px-4 py-1">
          {TYPE.map(([n, cls, ex]) => (
            <div key={n} className="flex items-center gap-4 border-b border-divider py-2.5 last:border-b-0">
              <span className="w-27.5 shrink-0 text-xs text-muted-foreground">{n}</span>
              <span className={cn('min-w-0 flex-1 truncate', cls)}>{ex}</span>
              <code className="font-mono text-2xs text-muted-foreground max-sm:hidden">{cls.split(' ')[0]}</code>
            </div>
          ))}
        </Panel>
      </Sec>

      <Sec title="Spacing, radius, elevation" note="4pt scale">
        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <Panel className="p-3.5">
            {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => (
              <div key={n} className="flex h-5.5 items-center gap-2 text-xs">
                <code className="w-14 font-mono text-muted-foreground">{`${n * 4}px`}</code>
                <span className="h-2 rounded-xs bg-primary/70" style={{ width: n * 4 }} />
              </div>
            ))}
          </Panel>
          <Panel className="flex flex-wrap items-center gap-3.5 p-3.5">
            {[
              ['rounded-sm', '4px'],
              ['rounded-md', '6px'],
              ['rounded-lg', '8px'],
              ['rounded-xl', '10px'],
            ].map(([r, v]) => (
              <div key={r} className="flex flex-col items-center gap-1.5 text-[11.5px]">
                <span className={cn('size-12 border-[1.5px] border-input bg-muted', r)} />
                <span className="text-muted-foreground">{v}</span>
              </div>
            ))}
            {[
              ['shadow-card', 'card'],
              ['shadow-md', 'menu'],
              ['shadow-drag', 'drag'],
            ].map(([s, n]) => (
              <div key={s} className="flex flex-col items-center gap-1.5 text-[11.5px]">
                <span className={cn('size-12 rounded-lg bg-background', s)} />
                <span className="text-muted-foreground">{n}</span>
              </div>
            ))}
          </Panel>
        </div>
      </Sec>

      <Sec title="Buttons" note="Default · Outline · Ghost · Danger · Icon">
        {(
          [
            ['default', 'Create task'],
            ['outline', 'Share'],
            ['ghost', 'Filter'],
            ['danger', 'Delete'],
          ] as const
        ).map(([v, l]) => (
          <Row key={v} lab={v}>
            <Button variant={v}>{l}</Button>
            <Button variant={v} disabled>
              {l}
            </Button>
            <Button variant={v} disabled>
              <Spinner />
              {l}
            </Button>
          </Row>
        ))}
        <Row lab="icon">
          {[Plus, ListFilter, Ellipsis, Star, Share2, Settings].map((I, i) => (
            <Tip key={i} label={I.displayName ?? 'Icon'}>
              <Button variant="ghost" size="icon" aria-label={I.displayName ?? 'Icon'} aria-pressed={i === 1} className="aria-pressed:bg-muted-strong">
                <I />
              </Button>
            </Tip>
          ))}
          <Button variant="ghost" size="icon" disabled aria-label="Disabled">
            <Trash />
          </Button>
          <span className="text-[11.5px] text-muted-foreground">Sizes:</span>
          <Button variant="outline" size="sm">
            Small
          </Button>
          <Button variant="outline">Medium</Button>
          <Button variant="outline" size="lg">
            Large
          </Button>
        </Row>
      </Sec>

      <Sec title="Inputs">
        <Panel className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))]">
          {(
            [
              ['Text', <Input key="a" placeholder="Task name" aria-label="Text" />],
              ['Error', <Input key="b" defaultValue="alex@" aria-invalid aria-label="Error" />],
              ['Disabled', <Input key="c" defaultValue="hello@example.com" disabled aria-label="Disabled" />],
              [
                'Search',
                <InputGroup key="d" className="h-7.5 rounded-md">
                  <InputGroupAddon className="[&>svg]:size-3.25">
                    <Search />
                  </InputGroupAddon>
                  <InputGroupInput placeholder="Search tasks" aria-label="Search" />
                  <InputGroupAddon align="inline-end">
                    <Kbd>/</Kbd>
                  </InputGroupAddon>
                </InputGroup>,
              ],
              [
                'Labels',
                <div key="e" className="flex min-h-7.5 flex-wrap gap-1 rounded-md border border-input p-1">
                  <TaskLabel id="design" />
                  <TaskLabel id="frontend" />
                  <TaskLabel id="qa" />
                  <span className="px-1 py-0.5 text-xs text-muted-foreground">Add…</span>
                </div>,
              ],
              ['Date', <Input key="f" type="date" defaultValue={dOff(3)} aria-label="Date" />],
              ['Time', <Input key="g" type="time" defaultValue="14:30" aria-label="Time" />],
              [
                'Checkbox · Radio · Switch',
                <div key="h" className="flex items-center gap-3.5">
                  <Checkbox defaultChecked aria-label="Checked" />
                  <Checkbox aria-label="Unchecked" />
                  <Checkbox defaultChecked className="rounded-full" aria-label="Round" />
                  <RadioGroup defaultValue="a" className="flex w-auto gap-3" aria-label="Radio">
                    <RadioGroupItem value="a" aria-label="Option A" />
                    <RadioGroupItem value="b" aria-label="Option B" />
                  </RadioGroup>
                  <Switch defaultChecked aria-label="On" />
                  <Switch aria-label="Off" />
                </div>,
              ],
              ['Textarea', <Textarea key="i" rows={2} defaultValue="Add a description…" aria-label="Textarea" />],
            ] as const
          ).map(([n, el]) => (
            <div key={n} className="flex flex-col gap-1.5 p-3.5">
              <span className="text-sm font-medium text-foreground">{n}</span>
              {el}
            </div>
          ))}
        </Panel>
      </Sec>

      <Sec title="Navigation">
        <div className="grid grid-cols-[260px_1fr] gap-4 max-sm:grid-cols-1">
          <div className="rounded-xl border bg-sidebar p-2">
            <SidebarMenu>
              <NavItem to={{ r: 'home' }} label="Home" icon={<House />} />
              <NavItem to={{ r: 'system' }} label="Design system" icon={<LayoutGrid />} />
              <NavItem to={{ r: 'inbox' }} label="Inbox" icon={<Inbox />} ct={3} dot />
              <NavItem to={{ r: 'mytasks' }} label="My Tasks" icon={<CircleCheck />} ct={2} />
            </SidebarMenu>
          </div>
          <div className="flex min-w-0 flex-col gap-3.5">
            <Breadcrumb className="rounded-lg border px-2.5 py-1.5">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="#">Cairn</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="#">Projects</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Website Redesign</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="flex flex-wrap items-center gap-2">
              <Seg
                label="Layout"
                value="grid"
                onChange={() => {}}
                items={[
                  { value: 'grid', label: 'Grid', icon: <LayoutGrid /> },
                  { value: 'list', label: 'List', icon: <List /> },
                  { value: 'table', label: 'Table', icon: <Table2 /> },
                ]}
              />
              <span className="inline-flex h-6.5 items-center gap-1.5 rounded-md border bg-muted pr-1 pl-2 text-sm">
                <CircleDot className="size-3" />
                <b className="font-medium text-fg-2">Status</b> is In Progress
                <Button variant="ghost" size="icon-xs" aria-label="Remove filter">
                  <X />
                </Button>
              </span>
            </div>
          </div>
        </div>
      </Sec>

      <Sec title="Data display">
        <div className="grid grid-cols-[300px_1fr] gap-4 max-md:grid-cols-1">
          <div className="rounded-xl bg-sunken p-2.5">{card && <KanbanCard t={card} showProj />}</div>
          <div className="flex min-w-0 flex-col gap-3">
            <Row lab="Avatar" className="mb-0">
              {['m1', 'm2', 'm3'].map(i => (
                <Avatar key={i} id={memberId(i)} size="sm" />
              ))}
              <Avatar id={memberId('m4')} />
              <Avatar id={memberId('m5')} size="md" />
              <Avatar id={memberId('m6')} size="lg" />
              <Avatar id={null} />
              <AvatarStack ids={['m1', 'm2', 'm3', 'm4', 'm5', 'm6'].map(memberId)} max={4} size="md" />
            </Row>
            <Row lab="Badge" className="mb-0">
              <Tag tone="muted">Default</Tag>
              <Tag tone="primary">Accent</Tag>
              <Tag tone="green">Active</Tag>
              <Tag tone="amber">Invited</Tag>
              <Tag tone="red">3 overdue</Tag>
              <ProjectStatusBadge s="active" />
              <ProjectStatusBadge s="risk" />
            </Row>
            <Row lab="Progress" className="mb-0">
              <span className="flex w-50">
                <ProgressBar v={64} />
              </span>
              <span className="flex w-30">
                <ProgressBar v={100} className={barTone.green} />
              </span>
              <span className="flex w-30">
                <ProgressBar v={30} className={barTone.red} />
              </span>
            </Row>
            <Panel>
              {allTasks(d)
                .slice(0, 2)
                .map((t, i) => (
                  <div key={t.id} className={cn(i === 0 && '*:border-t-0')}>
                    <MiniRow t={t} />
                  </div>
                ))}
            </Panel>
          </div>
        </div>
      </Sec>

      <Sec title="Feedback">
        <div className="mb-3 flex flex-col gap-2">
          <Callout tone="info" icon={Info}>
            <b className="font-semibold">Heads up.</b> Timeline dependencies are shown as dashed when out of order.
          </Callout>
          <Callout tone="ok" icon={CircleCheck}>
            Project archived.{' '}
            <Button variant="link" className="h-auto p-0" onClick={() => toast('Undone', { kind: 'info' })}>
              Undo
            </Button>
          </Callout>
          <Callout tone="warn" icon={TriangleAlert}>
            3 tasks due this week are not started.
          </Callout>
          <Callout tone="danger" icon={CircleAlert}>
            Your changes couldn&apos;t be saved.{' '}
            <Button variant="link" className="h-auto p-0" onClick={() => toast('Saved')}>
              Try again
            </Button>
          </Callout>
        </div>
        <Row lab="Triggers">
          <Button variant="outline" onClick={() => demoToast('ok')}>
            Toast
          </Button>
          <Button variant="outline" onClick={() => demoToast('err')}>
            Error toast
          </Button>
          <Tip label="Tooltips pair with icon buttons">
            <Button variant="outline">Tooltip</Button>
          </Tip>
          <Button variant="outline" onClick={() => newTask()}>
            Modal
          </Button>
          <Button variant="outline" onClick={() => openTask(taskId('t3'))}>
            Drawer
          </Button>
          <Button variant="outline" onClick={() => void demoConfirm()}>
            Confirmation
          </Button>
          <Button variant="outline" onClick={openPalette}>
            Command menu
          </Button>
        </Row>
      </Sec>

      <Sec title="Iconography" note="Lucide · 12–18px">
        <Panel className="grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-1.5 p-3.5 text-fg-2">
          {ICONS.map((I, i) => (
            <span key={i} className="grid h-9 place-items-center" title={I.displayName}>
              <I className="size-4.25" />
            </span>
          ))}
        </Panel>
      </Sec>
    </Page>
  );
}
