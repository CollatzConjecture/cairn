/* The member menu behind "…" and on right click, and the role picker.
   Members and Settings both use them. Each wraps its trigger (`children`) and owns its open state. */
import type { ComponentType, ReactElement, ReactNode } from 'react';
import { Mail, Plus, Send, Shield, User, UserMinus } from 'lucide-react';
import { ContextMenu, ContextMenuContent, ContextMenuSubContent, ContextMenuTrigger } from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Role } from '../domain/constants';
import type { MemberId } from '../domain/ids';
import { copy, get, go, memberById, mutate, newTask, removeMember, toast, useStore } from '../store';

type Trigger = { children: ReactElement };
type Assignable = Exclude<Role, 'Owner'>;
const ROLE_INFO: Record<Assignable, string> = {
  Admin: 'Manage members, settings, and all projects',
  Member: 'Create projects and work on tasks',
  Guest: 'Only sees projects they are invited to',
};
const ASSIGNABLE = ['Admin', 'Member', 'Guest'] as const satisfies readonly Assignable[];

/** Changes a member's role and says so in a toast. */
export function setRole(id: MemberId, role: Role) {
  const m = memberById(get().data, id);
  if (!m || m.role === role) return;
  if (
    mutate(s => {
      const x = memberById(s.data, id);
      if (x) x.role = role;
    })
  )
    toast(`${m.name} is now ${role === 'Admin' ? 'an' : 'a'} ${role}`);
}

function RoleItems({ value, onChange }: { value: Role; onChange: (v: Role) => void }) {
  return (
    <DropdownMenuRadioGroup
      value={value}
      onValueChange={v => {
        const r = ASSIGNABLE.find(x => x === v);
        if (r) onChange(r);
      }}
    >
      {ASSIGNABLE.map(r => (
        <DropdownMenuRadioItem key={r} value={r} closeOnClick className="items-start py-1.75">
          <span className="flex flex-col whitespace-normal">
            <span className="font-medium">{r}</span>
            <span className="text-[11.5px] text-muted-foreground">{ROLE_INFO[r]}</span>
          </span>
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}

/** Role picker with a description per role (Admin, Member, Guest). */
export function RolePicker({ children, value, onChange }: Trigger & { value: Role; onChange: (v: Role) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={children} />
      <DropdownMenuContent align="start" className="w-75">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Role</DropdownMenuLabel>
          <RoleItems value={value} onChange={onChange} />
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type SubContent = ComponentType<{ className?: string; children: ReactNode }>;
function MemberMenuItems({ id, Sub }: { id: MemberId; Sub: SubContent }) {
  const d = useStore(s => s.data);
  const m = memberById(d, id);
  if (!m) return null;
  const canRm = m.role !== 'Owner' && m.id !== d.me;
  return (
    <>
      <DropdownMenuItem onClick={() => go({ r: 'member', id })}>
        <User />
        View profile
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => newTask({ assignee: id })}>
        <Plus />
        Assign a task
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => void copy(m.email, 'Email copied')}>
        <Mail />
        Copy email
      </DropdownMenuItem>
      {canRm && (
        <>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Shield />
              Change role
            </DropdownMenuSubTrigger>
            <Sub className="w-75">
              <RoleItems value={m.role} onChange={r => setRole(id, r)} />
            </Sub>
          </DropdownMenuSub>
          {m.status === 'invited' && (
            <DropdownMenuItem onClick={() => toast(`Invite resent to ${m.email}`)}>
              <Send />
              Resend invite
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => void removeMember(id)}>
            <UserMinus />
            Remove from workspace
          </DropdownMenuItem>
        </>
      )}
    </>
  );
}

/** Member "…" menu: view profile, assign a task, copy email, change role, resend invite, remove. */
export function MemberMenu({ children, id }: Trigger & { id: MemberId }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={children} />
      <DropdownMenuContent align="end" className="w-auto">
        <MemberMenuItems id={id} Sub={DropdownMenuSubContent} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
/** The member menu on right click of `children` (a row). */
export function MemberContextMenu({ children, id }: Trigger & { id: MemberId }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger render={children} />
      <ContextMenuContent className="w-auto">
        <MemberMenuItems id={id} Sub={ContextMenuSubContent} />
      </ContextMenuContent>
    </ContextMenu>
  );
}
