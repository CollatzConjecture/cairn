/* The command palette: commands, workspace search, and the workspace switcher, in a CommandDialog that
   opens without animation. Selection is `ui.palette.hl`, reset to the first item whenever the query, mode or scope changes. */
import type { ComponentType, ReactNode } from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import {
  ArrowLeftRight,
  CalendarDays,
  ChartGantt,
  CircleCheck,
  ClockAlert,
  Command as CommandIcon,
  FolderKanban,
  FolderPlus,
  History,
  House,
  Inbox,
  Keyboard,
  Layers,
  LogOut,
  MessageSquare,
  Moon,
  PanelLeft,
  Paperclip,
  Folder,
  Palette as PaletteIcon,
  Plus,
  Search,
  SearchX,
  Settings,
  SignalHigh,
  Sun,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Command, CommandDialog, CommandGroup, CommandItem, CommandList, CommandSeparator, CommandShortcut } from '@/components/ui/command';
import { Kbd } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';
import { FT, MOD } from '../domain/constants';
import { projectId, viewId } from '../domain/ids';
import type { Data, Prefs } from '../domain/schema';
import {
  allTasks,
  effectiveDark,
  get,
  go,
  goTasks,
  invite,
  newProject,
  newTask,
  openModal,
  openTask,
  pColor,
  searchAll,
  set,
  shortcuts,
  signOut,
  sortTasks,
  switchWs,
  toggleDark,
  toggleSide,
  useStore,
  type Palette,
  type SearchScope,
} from '../store';
import { Logo, WsLogo } from '../ui/brand';
import { Avatar, Dot, Empty, Highlight, StatusIcon } from '../ui/helpers';
import { Icon } from '../ui/icon';

type Item = { icon: ReactNode; name: string; r?: string; kbd?: string; run: () => void };
type Group = { name: string; items: Item[] };
type Cmd = Item & { id: string };

export const closePalette = () =>
  set(s => {
    s.ui.palette = null;
  });
const setPalette = (patch: Partial<Palette>) =>
  set(s => {
    if (s.ui.palette) Object.assign(s.ui.palette, { hl: 0, ...patch });
  });
const openMode = (mode: Palette['mode']) =>
  set(s => {
    s.ui.palette = { q: '', mode, scope: 'all', hl: 0 };
    if (mode === 'search') s.ui.mnav = false;
  });
/** Opens the palette in search mode (the `/` key). */
export const openSearch = () => openMode('search');

const ic = (I: ComponentType<{ className?: string }>) => <I className="size-3.75 text-fg-2" />;

function commands(prefs: Prefs): Cmd[] {
  const dark = effectiveDark(prefs);
  const cmd = (id: string, name: string, icon: ReactNode, run: () => void, kbd?: string): Cmd => ({ id, name, icon, run, kbd });
  return [
    cmd('c-task', 'Create task', ic(Plus), () => newTask(), 'N'),
    cmd('c-proj', 'Create project', ic(FolderPlus), newProject, 'P'),
    cmd('c-search', 'Search workspace', ic(Search), openSearch, '/'),
    cmd('c-home', 'Go to Home', ic(House), () => go({ r: 'home' }), 'G H'),
    cmd('c-inbox', 'Go to Inbox', ic(Inbox), () => go({ r: 'inbox' }), 'G I'),
    cmd('c-my', 'Go to My Tasks', ic(CircleCheck), () => go({ r: 'mytasks' }), 'G T'),
    cmd('c-projs', 'Go to Projects', ic(FolderKanban), () => go({ r: 'projects' }), 'G P'),
    cmd('c-cal', 'Go to Calendar', ic(CalendarDays), () => go({ r: 'calendar' }), 'G C'),
    cmd('c-tl', 'Go to Timeline', ic(ChartGantt), () => go({ r: 'timeline' })),
    cmd('c-mem', 'Go to Members', ic(Users), () => go({ r: 'members' })),
    cmd('c-set', 'Open settings', ic(Settings), () => go({ r: 'settings', sec: 'appearance' }), 'G S'),
    cmd('c-app', 'Appearance settings', ic(PaletteIcon), () => go({ r: 'settings', sec: 'appearance' })),
    cmd('c-ws', 'Switch workspace…', ic(ArrowLeftRight), () => openMode('ws')),
    cmd('c-dark', dark ? 'Switch to light mode' : 'Switch to dark mode', ic(dark ? Sun : Moon), toggleDark, `${MOD} ⇧ L`),
    cmd('c-inv', 'Invite member', ic(UserPlus), invite),
    cmd('c-side', 'Toggle sidebar', ic(PanelLeft), toggleSide, '['),
    cmd('c-keys', 'Keyboard shortcuts', ic(Keyboard), shortcuts, '?'),
    cmd('c-out', 'Sign out', ic(LogOut), signOut),
  ];
}

function viewAll(q: string, sc: SearchScope) {
  set(s => {
    s.ui.searchQ = q;
    s.ui.searchCat = sc;
    s.data.recentSearches = [q, ...s.data.recentSearches.filter(x => x !== q)].slice(0, 5);
  });
  go({ r: 'search' });
}

/** The groups the palette lists for its mode and query. */
function paletteGroups(d: Data, prefs: Prefs, pl: Palette): Group[] {
  const q = pl.q.trim();
  const ql = q.toLowerCase();
  if (pl.mode === 'ws')
    return [
      {
        name: 'Switch workspace',
        items: d.workspaces
          .filter(w => !q || w.name.toLowerCase().includes(ql))
          .map(w => ({ icon: <WsLogo w={w} px={20} />, name: w.name, run: () => switchWs(w.id) })),
      },
    ];
  const groups: Group[] = [];
  if (pl.mode === 'cmd') {
    const cmds = commands(prefs).filter(c => !q || c.name.toLowerCase().includes(ql));
    if (!q) {
      const recent = sortTasks(
        d,
        allTasks(d).filter(t => t.assignee === d.me || t.fav),
        { f: 'updated', dir: 1 },
      ).slice(0, 4);
      return [
        { name: 'Suggestions', items: [...cmds.slice(0, 3), ...cmds.filter(c => c.id === 'c-ws' || c.id === 'c-dark')] },
        {
          name: 'Recent tasks',
          items: recent.map(t => ({ icon: <StatusIcon st={t.status} />, name: t.title, r: t.key, run: () => openTask(t.id) })),
        },
        { name: 'Navigation', items: cmds.filter(c => c.name.startsWith('Go to')) },
      ];
    }
    if (cmds.length) groups.push({ name: 'Commands', items: cmds.slice(0, 5) });
  }
  if (pl.mode === 'search' && !q)
    return [
      { name: 'Recent searches', items: d.recentSearches.map(s => ({ icon: ic(History), name: s, run: () => setPalette({ q: s }) })) },
      {
        name: 'Suggested',
        items: [
          { icon: ic(ClockAlert), name: 'Overdue tasks', run: () => goTasks('overdue') },
          { icon: ic(User), name: 'Tasks assigned to me', run: () => go({ r: 'mytasks' }) },
          { icon: ic(SignalHigh), name: 'High priority in Website Redesign', run: () => go({ r: 'project', id: projectId('p1'), tab: `v:${viewId('v1')}` }) },
          { icon: ic(Paperclip), name: 'Files in Website Redesign', run: () => go({ r: 'project', id: projectId('p1'), tab: 'files' }) },
        ],
      },
    ];
  const sc = pl.mode === 'search' ? pl.scope : 'all';
  const r = searchAll(d, q);
  const lim = sc === 'all' ? 4 : 12;
  const want = (k: SearchScope) => sc === 'all' || sc === k;
  if (want('tasks'))
    groups.push({
      name: 'Tasks',
      items: r.tasks.slice(0, lim).map(t => ({ icon: <StatusIcon st={t.status} />, name: t.title, r: t.key, run: () => openTask(t.id) })),
    });
  if (want('projects'))
    groups.push({
      name: 'Projects',
      items: r.projects.slice(0, lim).map(p => ({ icon: <Dot c={pColor(p)} />, name: p.name, run: () => go({ r: 'project', id: p.id }) })),
    });
  if (want('people'))
    groups.push({
      name: 'People',
      items: r.people.slice(0, lim).map(m => ({ icon: <Avatar id={m.id} size="sm" tip={false} />, name: m.name, run: () => go({ r: 'member', id: m.id }) })),
    });
  if (want('files'))
    groups.push({
      name: 'Files',
      items: r.files.slice(0, lim).map(f => ({
        icon: <Icon name={FT[f.type].i} className="size-3.75 text-fg-2" />,
        name: f.name,
        r: f.size,
        run: () => openModal({ type: 'filePreview', file: f, tid: f.task ?? null }),
      })),
    });
  if (want('comments'))
    groups.push({
      name: 'Comments',
      items: r.comments.slice(0, lim).map(c => ({
        icon: <Avatar id={c.by} size="sm" tip={false} />,
        name: c.text,
        run: () => openTask(c.task),
      })),
    });
  return [...groups.filter(g => g.items.length), { name: '', items: [{ icon: ic(Search), name: `View all results for “${q}”`, run: () => viewAll(q, sc) }] }];
}

const SCOPES: [SearchScope, string, ComponentType<{ className?: string }>][] = [
  ['all', 'All', Layers],
  ['tasks', 'Tasks', CircleCheck],
  ['projects', 'Projects', Folder],
  ['people', 'People', Users],
  ['files', 'Files', Paperclip],
  ['comments', 'Comments', MessageSquare],
];
const PLACEHOLDER = { search: 'Search tasks, projects, people, files, comments…', ws: 'Find a workspace…', cmd: 'Type a command or search…' };

/** Runs an item. An item that switches the palette's mode or query keeps it open; anything else closes it. */
function run(it: Item) {
  const before = get().ui.palette;
  it.run();
  if (get().ui.palette === before) closePalette();
}

function PaletteBox({ pl }: { pl: Palette }) {
  const d = useStore(s => s.data);
  const prefs = useStore(s => s.prefs);
  const groups = paletteGroups(d, prefs, pl);
  const flat = groups.flatMap(g => g.items);
  const hl = Math.min(pl.hl, Math.max(flat.length - 1, 0));
  const q = pl.q.trim();
  let n = 0;
  return (
    <Command
      shouldFilter={false}
      loop
      vimBindings={false}
      label="Command menu"
      className="min-h-0 flex-1 rounded-none! p-0"
      value={`pi-${hl}`}
      onValueChange={v => set(s => void (s.ui.palette && (s.ui.palette.hl = Number(v.slice(3)) || 0)))}
    >
      <div className="flex h-9.25 shrink-0 items-center gap-2.5 border-b px-3.5">
        {pl.mode === 'search' ? <Search className="size-4.25 text-fg-2" /> : <CommandIcon className="size-4.25 text-fg-2" />}
        {pl.mode !== 'cmd' && (
          <Badge variant="secondary" className="shrink-0">
            {pl.mode === 'search' ? 'Search' : 'Workspace'}
          </Badge>
        )}
        <CommandPrimitive.Input
          className="h-full min-w-0 flex-1 bg-transparent text-md outline-none placeholder:text-muted-foreground"
          value={pl.q}
          onValueChange={v => setPalette({ q: v })}
          placeholder={PLACEHOLDER[pl.mode]}
          onKeyDown={e => {
            if (e.key === 'Tab') {
              e.preventDefault();
              setPalette({ mode: pl.mode === 'cmd' ? 'search' : 'cmd' });
            } else if (e.key === 'Backspace' && !pl.q && pl.mode !== 'cmd') {
              e.preventDefault();
              setPalette({ mode: 'cmd' });
            } else if (e.key === 'Home' || e.key === 'End') e.stopPropagation();
          }}
        />
        <Kbd>Esc</Kbd>
      </div>
      {pl.mode === 'search' && (
        <div className="flex shrink-0 flex-wrap gap-1 border-b border-divider px-3 py-2" role="group" aria-label="Search in">
          {SCOPES.map(([k, name, I]) => (
            <button
              key={k}
              aria-pressed={pl.scope === k}
              className={cn(
                'inline-flex h-6 items-center gap-1.25 rounded-full border px-2.25 text-xs text-fg-2 transition-colors hover:bg-muted active:scale-97',
                pl.scope === k && 'border-foreground bg-foreground text-background hover:bg-foreground',
              )}
              onMouseDown={e => e.preventDefault()}
              onClick={() => setPalette({ scope: k })}
            >
              <I className="size-3" />
              {name}
            </button>
          ))}
        </div>
      )}
      <CommandList className="max-h-none min-h-0 flex-1 p-1.5">
        {flat.length ? (
          groups.map((g, gi) => (
            <div key={gi}>
              {gi > 0 && <CommandSeparator className="mx-0 mb-0.5" />}
              <CommandGroup heading={g.name || undefined} className="p-0 pb-1 **:[[cmdk-group-heading]]:px-2.5 **:[[cmdk-group-heading]]:pt-2.5">
                {g.items.map(it => {
                  const i = n++;
                  return (
                    <CommandItem key={i} value={`pi-${i}`} className="min-h-9.5 gap-2.5 px-2.5" onMouseDown={e => e.preventDefault()} onSelect={() => run(it)}>
                      {it.icon}
                      <span className="min-w-0 truncate [&_mark]:bg-transparent [&_mark]:px-0 [&_mark]:font-semibold [&_mark]:text-primary">
                        <Highlight text={it.name} q={q} />
                      </span>
                      {(it.r || it.kbd) && (
                        <CommandShortcut className="flex shrink-0 items-center gap-1 tracking-normal">
                          {it.r && <span className="font-mono">{it.r}</span>}
                          {it.kbd?.split(' ').map((k, ki) => (
                            <Kbd key={ki}>{k}</Kbd>
                          ))}
                        </CommandShortcut>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </div>
          ))
        ) : (
          <Empty icon={SearchX} title="No results found" text="Try a different keyword, or press Tab to search everything." className="py-8" level={3} />
        )}
      </CommandList>
      <div className="flex shrink-0 items-center gap-3.5 border-t bg-sunken px-3.5 py-2 text-xs text-muted-foreground max-sm:hidden" aria-hidden="true">
        <span className="inline-flex items-center gap-1.25">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          navigate
        </span>
        <span className="inline-flex items-center gap-1.25">
          <Kbd>↵</Kbd>
          select
        </span>
        <span className="inline-flex items-center gap-1.25">
          {pl.mode === 'cmd' ? (
            <>
              <Kbd>Tab</Kbd>search mode
            </>
          ) : (
            <>
              <Kbd>⌫</Kbd>back to commands
            </>
          )}
        </span>
        <span className="ml-auto text-fg-2">
          <Logo h={12} />
        </span>
      </div>
    </Command>
  );
}

export function PaletteLayer() {
  const pl = useStore(s => s.ui.palette);
  if (!pl) return null;
  return (
    <CommandDialog
      open
      onOpenChange={open => !open && closePalette()}
      title="Command menu"
      description="Run a command, search the workspace, or switch workspace."
      className="top-[12vh] flex max-h-[70vh] flex-col gap-0 max-sm:top-2 sm:max-w-160"
    >
      <PaletteBox pl={pl} />
    </CommandDialog>
  );
}
