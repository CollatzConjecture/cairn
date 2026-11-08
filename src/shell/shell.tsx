/* The app frame: shadcn Sidebar (collapse to icons, a sheet below 900px), topbar, content area, mobile bottom nav. */
import { useState, type MouseEvent, type ReactNode } from 'react';
import {
  Activity,
  Archive,
  Bell,
  Calendar,
  ChartGantt,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  CircleCheck,
  CircleQuestionMark,
  Ellipsis,
  FolderKanban,
  House,
  Inbox,
  LayoutDashboard,
  List,
  ListChecks,
  Lock,
  Menu,
  PanelLeft,
  Paperclip,
  Plus,
  Search,
  Settings,
  SquareKanban,
  Star,
  Users,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  useSidebar,
} from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { MOD, PSTAT } from '../domain/constants';
import { TODAY, diffD, parse } from '../domain/date';
import type { Project } from '../domain/schema';
import {
  allTasks,
  closeMnav,
  get,
  go,
  hrefOf,
  memberById,
  newProject,
  newTeam,
  openMnav,
  openPalette,
  pColor,
  projectById,
  retryOnline,
  teamById,
  toggleExpand,
  toggleSide,
  useRoute,
  useStore,
  visibleProjects,
  type AppRoute,
  type GoTarget,
  type PageRoute,
} from '../store';
// Installs the document-level drag handlers for sidebar projects and list rows on every app page.
import '../project/row-dnd';
import { ProjectContextMenu, ProjectMenu } from '../components/project-menu';
import { WsLogo } from '../ui/brand';
import { Avatar, Tip } from '../ui/helpers';
import { Icon } from '../ui/icon';
import { CreateMenu, HelpMenu, UserMenu, WorkspaceMenu } from './menus';
import { Skeleton } from './skeletons';

export const ROUTE_NAMES: Record<PageRoute | 'member' | 'team' | 'settings', string> = {
  home: 'Home',
  inbox: 'Inbox',
  mytasks: 'My Tasks',
  favorites: 'Favorites',
  notifications: 'Notifications',
  search: 'Search',
  overview: 'Overview',
  projects: 'Projects',
  tasks: 'Tasks',
  calendar: 'Calendar',
  timeline: 'Timeline',
  members: 'Members',
  member: 'Member',
  teams: 'Teams',
  team: 'Team',
  activity: 'Activity',
  settings: 'Settings',
  system: 'Design system',
  states: 'System states',
  archive: 'Archive',
};
const NAMES: Partial<Record<AppRoute['r'], string>> = ROUTE_NAMES;
/** The page name in breadcrumbs and the document title; routes without one (and the 404) read "Not found". */
export const routeName = (r: AppRoute | null) => (r && NAMES[r.r]) || 'Not found';

/** Props for an `<a>` to an app route: a real href (open in new tab works) and in-app navigation on a plain click, or `open` instead. */
export function linkTo(to: GoTarget, open = () => go(to)) {
  const r: AppRoute = to.r === 'project' ? { ...to, tab: to.tab ?? get().prefs.defaultTab ?? 'board' } : to;
  return {
    href: hrefOf(r),
    onClick: (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      open();
    },
  };
}

const isCurrent = (route: AppRoute | null, to: GoTarget) => route?.r === to.r && (!('id' in to) || ('id' in route && route.id === to.id));

/** A sidebar link, current when its route (and id) match; a tooltip names it while the sidebar is collapsed. */
export function NavItem({ to, label, icon, ct, dot = false }: { to: GoTarget; label: string; icon: ReactNode; ct?: number; dot?: boolean }) {
  const route = useRoute();
  const on = isCurrent(route, to);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton isActive={on} tooltip={label} render={<a {...linkTo(to)} aria-current={on ? 'page' : undefined} />}>
        {icon}
        <span>{label}</span>
      </SidebarMenuButton>
      {!!ct && (
        <SidebarMenuBadge
          className={cn(
            'top-1/2! right-2 -translate-y-1/2 text-2xs font-normal text-muted-foreground',
            dot && 'h-4 min-w-4 rounded-full bg-primary px-1 font-semibold text-primary-foreground',
          )}
        >
          {ct}
        </SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  );
}

const SUB_TABS = [
  ['board', 'Board', SquareKanban],
  ['list', 'List', List],
  ['timeline', 'Timeline', ChartGantt],
  ['files', 'Files', Paperclip],
] as const;

function SidebarProject({ p }: { p: Project }) {
  const route = useRoute();
  const open = useStore(s => !!s.ui.expanded[p.id]);
  const { state, isMobile } = useSidebar();
  const on = route?.r === 'project' && route.id === p.id;
  return (
    <SidebarMenuItem data-proj-drop={p.id}>
      <ProjectContextMenu id={p.id}>
        <SidebarMenuButton
          isActive={on}
          tooltip={p.name}
          className="group-has-data-[sidebar=menu-action]/menu-item:pr-2 group-has-data-[sidebar=menu-action]/menu-item:group-hover/menu-item:pr-14 group-has-data-[sidebar=menu-action]/menu-item:group-focus-within/menu-item:pr-14 group-has-data-[sidebar=menu-action]/menu-item:group-has-aria-expanded/menu-item:pr-14 max-md:group-has-data-[sidebar=menu-action]/menu-item:pr-14"
          render={<a {...linkTo({ r: 'project', id: p.id })} draggable data-drag-proj={p.id} aria-current={on ? 'page' : undefined} />}
        >
          <span className="grid size-4.5 shrink-0 place-items-center rounded-[5px] bg-(--c)/16 text-tint [&_svg]:size-3!" style={{ '--c': pColor(p) }}>
            <Icon name={p.icon} />
          </span>
          <span className="min-w-0 truncate">{p.name}</span>
          {p.fav && <Star className="ml-1 size-2.75! text-amber" aria-label="Favorite" />}
          {p.private && <Lock className="ml-1 size-2.75! text-muted-foreground" aria-label="Private" />}
          <span
            className="ml-auto size-1.5 shrink-0 rounded-full bg-(--c) group-hover/menu-item:hidden group-focus-within/menu-item:hidden group-has-aria-expanded/menu-item:hidden group-data-[collapsible=icon]:hidden max-md:hidden"
            style={{ '--c': PSTAT[p.status].c }}
            title={PSTAT[p.status].name}
          />
        </SidebarMenuButton>
      </ProjectContextMenu>
      <ProjectMenu id={p.id}>
        <SidebarMenuAction showOnHover className="top-1! right-7.5 size-5.5 text-fg-2" aria-label="Project options">
          <Ellipsis />
        </SidebarMenuAction>
      </ProjectMenu>
      <SidebarMenuAction
        showOnHover
        className="top-1! right-1.5 size-5.5 text-fg-4"
        onClick={() => toggleExpand(p.id)}
        aria-label={open ? 'Collapse sub-pages' : 'Expand sub-pages'}
      >
        <ChevronRight className={cn('transition-transform', open && 'rotate-90')} />
      </SidebarMenuAction>
      {open && (state === 'expanded' || isMobile) && (
        <SidebarMenuSub className="mx-0 ml-2 gap-0.5 py-0.5 pr-0 pl-3.5">
          {SUB_TABS.map(([tab, n, I]) => (
            <SidebarMenuSubItem key={tab}>
              <SidebarMenuSubButton
                isActive={on && route.tab === tab}
                className="h-(--side-row) gap-2.25 font-[450] text-sidebar-foreground data-[size=md]:text-base data-active:bg-sidebar-active data-active:shadow-sidebar-active [&>svg]:size-3.5 [&>svg]:text-fg-4"
                {...linkTo({ r: 'project', id: p.id, tab })}
              >
                <I />
                <span>{n}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}

const groupCls = 'mt-3.5 p-0 group-data-[collapsible=icon]:mt-2.5 group-data-[collapsible=icon]:border-t group-data-[collapsible=icon]:pt-2.5';
const labelCls = 'h-6 rounded-none text-2xs font-semibold tracking-wider text-muted-foreground uppercase group-data-[collapsible=icon]:hidden';
const actionCls = 'top-0.5! right-1 size-5.5 text-fg-2 opacity-0 group-hover/group:opacity-100 focus-visible:opacity-100 max-md:opacity-100';

function AppSidebar() {
  const d = useStore(s => s.data);
  const { state, isMobile } = useSidebar();
  const collapsed = state === 'collapsed' && !isMobile;
  const unreadInbox = d.notifs.filter(n => !n.read && n.type !== 'update').length;
  const unreadAll = d.notifs.filter(n => !n.read).length;
  const myOpen = allTasks(d).filter(t => t.assignee === d.me && t.status !== 'done' && t.due && diffD(parse(t.due), TODAY) <= 0).length;
  const archived = d.tasks.filter(t => t.archived).length + d.projects.filter(p => p.archived).length;
  const name = useStore(s => s.prefs.name);
  return (
    <Sidebar collapsible="icon" role="navigation" aria-label="Main" className="select-none">
      <SidebarHeader className="flex-row items-center gap-0.5 px-2 pt-2 pb-1">
        <WorkspaceMenu>
          <SidebarMenuButton
            className="h-8 min-w-0 flex-1 gap-2 px-1.5 font-semibold text-foreground group-data-[collapsible=icon]:px-1.75!"
            aria-label="Switch workspace"
          >
            <WsLogo w={d.ws} px={22} />
            <span className="truncate group-data-[collapsible=icon]:hidden">{d.ws.name}</span>
            <ChevronsUpDown className="size-3.25! text-muted-foreground group-data-[collapsible=icon]:hidden" />
          </SidebarMenuButton>
        </WorkspaceMenu>
        {!collapsed && !isMobile && (
          <Tip label="Collapse sidebar  [">
            <Button variant="ghost" size="icon-sm" onClick={toggleSide} aria-label="Collapse sidebar">
              <PanelLeft />
            </Button>
          </Tip>
        )}
      </SidebarHeader>
      <SidebarContent className="px-2 pt-1 pb-3">
        <SidebarMenu>
          {collapsed && (
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Expand sidebar" onClick={toggleSide} aria-label="Expand sidebar">
                <PanelLeft />
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <NavItem to={{ r: 'home' }} label="Home" icon={<House />} />
          <NavItem to={{ r: 'inbox' }} label="Inbox" icon={<Inbox />} ct={unreadInbox} dot />
          <NavItem to={{ r: 'mytasks' }} label="My Tasks" icon={<CircleCheck />} ct={myOpen} />
          <NavItem to={{ r: 'favorites' }} label="Favorites" icon={<Star />} />
          <NavItem to={{ r: 'notifications' }} label="Notifications" icon={<Bell />} ct={unreadAll} />
        </SidebarMenu>
        <SidebarGroup className={groupCls}>
          <SidebarGroupLabel className={labelCls}>Workspace</SidebarGroupLabel>
          <SidebarMenu>
            <NavItem to={{ r: 'overview' }} label="Overview" icon={<LayoutDashboard />} />
            <NavItem to={{ r: 'projects' }} label="Projects" icon={<FolderKanban />} />
            <NavItem to={{ r: 'tasks' }} label="Tasks" icon={<ListChecks />} />
            <NavItem to={{ r: 'calendar' }} label="Calendar" icon={<Calendar />} />
            <NavItem to={{ r: 'timeline' }} label="Timeline" icon={<ChartGantt />} />
            <NavItem to={{ r: 'members' }} label="Members" icon={<Users />} />
            <NavItem to={{ r: 'activity' }} label="Activity" icon={<Activity />} />
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup className={cn(groupCls, 'group/group')} id="side-projects">
          <SidebarGroupLabel className={labelCls}>Projects</SidebarGroupLabel>
          <Tip label="New project  P">
            <SidebarGroupAction className={actionCls} onClick={newProject} aria-label="New project">
              <Plus />
            </SidebarGroupAction>
          </Tip>
          <SidebarMenu>
            {visibleProjects(d)
              .filter(p => p.status !== 'complete')
              .map(p => (
                <SidebarProject key={p.id} p={p} />
              ))}
            <NavItem to={{ r: 'archive' }} label="Archive" icon={<Archive />} ct={archived} />
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup className={cn(groupCls, 'group/group')}>
          <SidebarGroupLabel className={labelCls}>Teams</SidebarGroupLabel>
          <Tip label="New team">
            <SidebarGroupAction className={actionCls} onClick={newTeam} aria-label="New team">
              <Plus />
            </SidebarGroupAction>
          </Tip>
          <SidebarMenu>
            {d.teams.map(t => (
              <NavItem key={t.id} to={{ r: 'team', id: t.id }} label={t.name} icon={<Icon name={t.icon} />} />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-0 border-t px-2 pt-1.5 pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <HelpMenu>
              <SidebarMenuButton tooltip="Help">
                <CircleQuestionMark />
                <span>Help &amp; resources</span>
              </SidebarMenuButton>
            </HelpMenu>
          </SidebarMenuItem>
          <NavItem to={{ r: 'settings', sec: 'appearance' }} label="Settings" icon={<Settings />} />
          <SidebarMenuItem>
            <UserMenu align="start" side="top">
              <SidebarMenuButton tooltip="Profile" className="h-9 group-data-[collapsible=icon]:px-1.75!">
                <Avatar id={d.me} presence tip={false} />
                <span className="font-medium text-foreground">{name}</span>
                <ChevronsUpDown className="ml-auto size-3.25! text-muted-foreground group-data-[collapsible=icon]:hidden" />
              </SidebarMenuButton>
            </UserMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function Crumbs() {
  const r = useRoute();
  const d = useStore(s => s.data);
  const sep = <BreadcrumbSeparator className="text-xs text-fg-4">/</BreadcrumbSeparator>;
  const link = (to: GoTarget, label: ReactNode) => (
    <BreadcrumbItem>
      <BreadcrumbLink render={<a {...linkTo(to)} />} className="py-0.75 whitespace-nowrap">
        {label}
      </BreadcrumbLink>
    </BreadcrumbItem>
  );
  const page = (label: ReactNode) => (
    <BreadcrumbItem className="min-w-0">
      <BreadcrumbPage className="truncate font-medium">{label}</BreadcrumbPage>
    </BreadcrumbItem>
  );
  let items: ReactNode = page(routeName(r));
  if (r?.r === 'project') {
    const p = projectById(d, r.id);
    items = (
      <>
        {link({ r: 'projects' }, 'Projects')}
        {p && (
          <>
            {sep}
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbLink
                render={<a {...linkTo({ r: 'project', id: p.id, tab: 'overview' })} aria-current="page" />}
                className="flex min-w-0 items-center gap-1.5 font-medium text-foreground"
              >
                <span className="grid size-4 shrink-0 place-items-center rounded-sm bg-(--c)/16 text-tint [&_svg]:size-2.75" style={{ '--c': pColor(p) }}>
                  <Icon name={p.icon} />
                </span>
                <span className="truncate">{p.name}</span>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
      </>
    );
  } else if (r?.r === 'member')
    items = (
      <>
        {link({ r: 'members' }, 'Members')}
        {sep}
        {page(memberById(d, r.id)?.name || 'Member')}
      </>
    );
  else if (r?.r === 'team')
    items = (
      <>
        {link({ r: 'teams' }, 'Teams')}
        {sep}
        {page(teamById(d, r.id)?.name || 'Team')}
      </>
    );
  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap gap-2 text-sm text-fg-2">{items}</BreadcrumbList>
    </Breadcrumb>
  );
}

function Topbar() {
  const unread = useStore(s => s.data.notifs.some(n => !n.read));
  const me = useStore(s => s.data.me);
  const { isMobile } = useSidebar();
  return (
    <header className="relative z-5 flex h-(--topbar-h) shrink-0 items-center gap-1.5 border-b bg-background pr-3 pl-(--gutter)">
      {isMobile && (
        <Button variant="ghost" size="icon" className="-ml-1.5" onClick={openMnav} aria-label="Open navigation">
          <Menu className="size-4.25" />
        </Button>
      )}
      <Crumbs />
      <span className="flex-1" />
      <button
        className="flex h-6.5 w-55 items-center gap-2 rounded-md border bg-sunken pr-1.5 pl-2.25 text-sm text-muted-foreground transition-colors hover:border-input hover:text-fg-2 active:scale-[0.97] max-[1100px]:w-auto max-[1100px]:border-transparent max-[1100px]:bg-transparent max-[1100px]:px-2"
        onClick={openPalette}
        aria-label="Search and commands"
      >
        <Search className="size-3.5 shrink-0" />
        <span className="truncate max-[1100px]:hidden">Search or jump to…</span>
        <Kbd className="ml-auto max-[1100px]:hidden">{`${MOD}K`}</Kbd>
      </button>
      <Tip label="Notifications" side="bottom">
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          nativeButton={false}
          render={<a {...linkTo({ r: 'notifications' })} />}
          aria-label="Notifications"
        >
          <Bell />
          {unread && <span className="absolute top-1.5 right-1.75 size-1.75 rounded-full bg-primary ring-2 ring-background" />}
        </Button>
      </Tip>
      <CreateMenu>
        <Button variant="outline" size="sm" className="max-sm:size-9.5 max-sm:px-0" aria-label="Create new">
          <Plus />
          <span className="max-sm:hidden">New</span>
          <ChevronDown className="size-3! max-sm:hidden" />
        </Button>
      </CreateMenu>
      <UserMenu className="w-65">
        <Button variant="ghost" size="icon" className="w-auto border-0 px-0.5 max-sm:hidden" aria-label="Account menu">
          <Avatar id={me} size="md" tip={false} />
        </Button>
      </UserMenu>
    </header>
  );
}

function BottomNav() {
  const r = useRoute();
  const unread = useStore(s => s.data.notifs.some(n => !n.read && n.type !== 'update'));
  const item =
    'relative flex min-h-12 flex-1 flex-col items-center gap-0.5 rounded-md py-1.25 text-2xs text-muted-foreground active:scale-[0.97] aria-[current=page]:text-foreground [&_svg]:size-4.75';
  const b = (to: PageRoute, label: string, I: LucideIcon, extra?: ReactNode) => (
    <a className={item} {...linkTo({ r: to })} aria-current={r?.r === to ? 'page' : undefined}>
      <I />
      <span>{label}</span>
      {extra}
    </a>
  );
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-45 flex border-t bg-background px-1.5 pt-1 pb-[calc(4px+env(safe-area-inset-bottom,0px))] sm:hidden"
      aria-label="Primary"
    >
      {b('home', 'Home', House)}
      {b('mytasks', 'My Tasks', CircleCheck)}
      {b('projects', 'Projects', FolderKanban)}
      {b('inbox', 'Inbox', Inbox, unread && <span className="absolute top-0.75 left-[calc(50%+6px)] size-1.75 rounded-full bg-primary" />)}
      <button className={item} onClick={openMnav}>
        <Ellipsis />
        <span>More</span>
      </button>
    </nav>
  );
}

function OfflineBar() {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-2 border-b bg-amber/12 px-3.5 py-1.75 text-sm" role="alert">
      <WifiOff className="size-3.75 shrink-0 text-amber" />
      <span>
        <b className="font-semibold">You&apos;re offline.</b> Changes won&apos;t be saved until your connection is back.
      </span>
      <span className="flex-1" />
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void retryOnline().then(() => setBusy(false));
        }}
      >
        {busy && <Spinner />}
        Try again
      </Button>
    </div>
  );
}

/** Wraps every in-app page. `children` is the page; the loading flag swaps it for its skeleton. */
export function Shell({ children }: { children: ReactNode }) {
  const collapsed = useStore(s => s.ui.collapsed);
  const mnav = useStore(s => s.ui.mnav);
  const offline = useStore(s => s.ui.offline);
  const loading = useStore(s => s.ui.loading);
  return (
    <SidebarProvider
      open={!collapsed}
      onOpenChange={open => open === collapsed && toggleSide()}
      openMobile={mnav}
      onOpenMobileChange={o => (o ? openMnav() : closeMnav())}
      className="h-svh min-h-0"
    >
      <button
        className="sr-only fixed top-[calc(8px+env(safe-area-inset-top,0px))] left-3 z-300 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background focus:not-sr-only"
        onClick={() => document.getElementById('main-content')?.focus()}
      >
        Skip to content
      </button>
      <AppSidebar />
      <SidebarInset className="min-h-0 min-w-0 overflow-hidden" id="main">
        <Topbar />
        {offline && <OfflineBar />}
        <div className="relative min-h-0 flex-1 overflow-auto outline-none" id="main-content" tabIndex={-1}>
          {loading ? <Skeleton /> : children}
        </div>
      </SidebarInset>
      <BottomNav />
    </SidebarProvider>
  );
}
