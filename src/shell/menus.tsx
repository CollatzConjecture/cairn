/* Shell menus. Each wraps its trigger (`children`). */
import type { ReactElement } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Check,
  CircleCheck,
  Command,
  Component,
  FileQuestionMark,
  FolderPlus,
  Keyboard,
  Layers,
  LogOut,
  Monitor,
  Moon,
  Plus,
  RotateCcw,
  Settings,
  Sparkles,
  Sun,
  User,
  UserPlus,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { MOD } from '../domain/constants';
import type { Prefs } from '../domain/schema';
import {
  go,
  invite,
  me,
  newProject,
  newTask,
  newTeam,
  newWorkspace,
  openPalette,
  resetDemo,
  setTheme,
  shortcuts,
  signOut,
  startOnboarding,
  switchWs,
  toggleOffline,
  useStore,
} from '../store';
import { WsLogo } from '../ui/brand';
import { Avatar } from '../ui/helpers';

type Trigger = { children: ReactElement; align?: 'start' | 'end'; side?: 'top' | 'bottom' | 'right'; className?: string };

export function WorkspaceMenu({ children, align = 'start' }: Trigger) {
  const workspaces = useStore(s => s.data.workspaces);
  const current = useStore(s => s.data.ws.name);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={children} />
      <DropdownMenuContent align={align}>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {workspaces.map(w => (
            <DropdownMenuItem key={w.id} onClick={() => switchWs(w.id)}>
              <WsLogo w={w} px={20} />
              <span className="grow">{w.name}</span>
              <span className="text-2xs text-muted-foreground">{w.plan}</span>
              {w.name === current && <Check className="text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={newWorkspace}>
          <Plus />
          Create workspace
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => go({ r: 'settings', sec: 'workspace' })}>
          <Settings />
          Workspace settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={invite}>
          <UserPlus />
          Invite members
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CreateMenu({ children, align = 'end' }: Trigger) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={children} />
      <DropdownMenuContent align={align} className="w-55">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Create</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => newTask()}>
            <CircleCheck />
            Task
            <DropdownMenuShortcut>N</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={newProject}>
            <FolderPlus />
            Project
            <DropdownMenuShortcut>P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={newTeam}>
            <Users />
            Team
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={invite}>
          <UserPlus />
          Invite member
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const THEMES = [
  ['light', Sun, 'Light'],
  ['dark', Moon, 'Dark'],
  ['system', Monitor, 'System'],
] as const;

export function UserMenu({ children, align = 'end', side, className }: Trigger) {
  const d = useStore(s => s.data);
  const name = useStore(s => s.prefs.name);
  const theme = useStore(s => s.prefs.theme);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={children} />
      <DropdownMenuContent align={align} side={side} className={className}>
        <div className="flex items-center gap-2.5 px-2 pt-2 pb-2.5">
          <Avatar id={d.me} size="lg" tip={false} />
          <div className="min-w-0">
            <div className="font-semibold">{name}</div>
            <div className="truncate text-xs text-muted-foreground">{me(d)?.email}</div>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => go({ r: 'member', id: d.me })}>
          <User />
          View profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => go({ r: 'settings', sec: 'profile' })}>
          <Settings />
          Account settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <div className="px-1.5 pt-0.5 pb-1.5">
            <ToggleGroup value={[theme]} onValueChange={v => v[0] && setTheme(v[0] as Prefs['theme'])} aria-label="Theme" className="w-full">
              {THEMES.map(([k, I, n]) => (
                <ToggleGroupItem key={k} value={k} size="sm" className="flex-1 gap-1.25">
                  <I className="size-3.25" />
                  {n}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={shortcuts}>
          <Keyboard />
          Keyboard shortcuts
          <DropdownMenuShortcut>?</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={signOut}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function HelpMenu({ children, align = 'start', side = 'top' }: Trigger) {
  const offline = useStore(s => s.ui.offline);
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={children} />
      <DropdownMenuContent align={align} side={side}>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Help & resources</DropdownMenuLabel>
          <DropdownMenuItem onClick={shortcuts}>
            <Keyboard />
            Keyboard shortcuts
            <DropdownMenuShortcut>?</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openPalette}>
            <Command />
            Command menu
            <DropdownMenuShortcut>{`${MOD}K`}</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => go({ r: 'system' })}>
            <Component />
            Design system
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => go({ r: 'states' })}>
            <Layers />
            System states
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Prototype</DropdownMenuLabel>
          <DropdownMenuItem onClick={startOnboarding}>
            <Sparkles />
            Replay onboarding
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleOffline}>
            {offline ? <Wifi /> : <WifiOff />}
            {offline ? 'Go back online' : 'Simulate offline'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void navigate({ href: '/nowhere' })}>
            <FileQuestionMark />
            Open a broken link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void resetDemo()}>
            <RotateCcw />
            Reset demo data
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
