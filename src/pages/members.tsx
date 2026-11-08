import { ChevronDown, Crown, Ellipsis, Plus, SearchX, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ROLES } from '../domain/constants';
import { ago, minsAgo } from '../domain/date';
import type { Member } from '../domain/schema';
import { linkTo } from '../shell/shell';
import { allTasks, invite, me, newTeam, set, setUi, teamOrNone, useStore, visibleProjects } from '../store';
import { Avatar, Empty } from '../ui/helpers';
import { Icon } from '../ui/icon';
import { LineTabs, Page, PageHeader, Panel, SearchField, Seg, stretched, tc } from './kit';
import { MemberContextMenu, MemberMenu, RolePicker, setRole } from './menus';
import { PermsTable } from './perms-table';
import { TeamsGrid } from './teams-grid';

/** The role cell: a picker for admins (never on the Owner), otherwise a plain label. */
export function RoleCell({ m, canEdit }: { m: Member; canEdit: boolean }) {
  const pill = 'inline-flex h-6.5 items-center gap-1.25 rounded-md px-2 text-sm [&_svg]:size-3.25';
  return canEdit && m.role !== 'Owner' ? (
    <RolePicker value={m.role} onChange={r => setRole(m.id, r)}>
      <button className={cn(pill, 'relative z-10 border border-input transition-colors hover:bg-muted aria-expanded:bg-muted')} aria-label={`Role: ${m.role}`}>
        {m.role}
        <ChevronDown className="text-muted-foreground" />
      </button>
    </RolePicker>
  ) : (
    <span className={pill}>
      {m.role === 'Owner' && <Crown />}
      {m.role}
    </span>
  );
}

export const MemberStatus = ({ m }: { m: Member }) =>
  m.status === 'invited' ? (
    <Badge className="rounded-[5px] bg-amber/12 text-amber">
      <span className="size-1.5 rounded-full bg-current" />
      Invited
    </Badge>
  ) : m.status === 'deactivated' ? (
    <Badge variant="outline" className="rounded-[5px] bg-muted text-fg-2">
      Deactivated
    </Badge>
  ) : (
    <Badge className="rounded-[5px] bg-green/12 text-green">
      <span className="size-1.5 rounded-full bg-current" />
      Active
    </Badge>
  );

function Directory() {
  const d = useStore(s => s.data);
  const q = useStore(s => s.ui.memQ);
  const role = useStore(s => s.ui.memRole);
  const ql = q.toLowerCase();
  const ms = d.members.filter(m => (role === 'all' || m.role === role) && (!ql || m.name.toLowerCase().includes(ql) || m.email.includes(ql)));
  const isAdmin = ['Owner', 'Admin'].includes(me(d)?.role ?? '');
  const ps = visibleProjects(d);
  const ts = allTasks(d);
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchField
          label="Search members"
          placeholder="Search by name or email"
          value={q}
          onChange={v =>
            set(s => {
              s.ui.memQ = v;
            })
          }
        />
        <Seg label="Role" value={role} onChange={v => setUi('memRole', v)} items={['all', ...ROLES].map(r => ({ value: r, label: r === 'all' ? 'All' : r }))} />
      </div>
      <Panel>
        {ms.length ? (
          <Table className={cn(tc.table, 'min-w-220')}>
            <TableHeader>
              <TableRow className={tc.row}>
                <TableHead className={tc.head}>Member</TableHead>
                <TableHead className={tc.head}>Role</TableHead>
                <TableHead className={tc.head}>Team</TableHead>
                <TableHead className={cn(tc.head, 'text-center')}>Active projects</TableHead>
                <TableHead className={cn(tc.head, 'text-center')}>Tasks</TableHead>
                <TableHead className={tc.head}>Last active</TableHead>
                <TableHead className={tc.head}>Status</TableHead>
                <TableHead className={tc.head} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {ms.map(m => {
                const tm = teamOrNone(d, m.team);
                return (
                  <MemberContextMenu key={m.id} id={m.id}>
                    <TableRow className={cn(tc.link, 'last:border-b-0')}>
                      <TableCell className={tc.cell}>
                        <span className="flex items-center gap-2.5">
                          <Avatar id={m.id} size="md" tip={false} />
                          <span className="flex flex-col">
                            <a {...linkTo({ r: 'member', id: m.id })} className={cn(stretched, 'font-medium')}>
                              {m.name}
                              {m.id === d.me && <span className="font-normal text-muted-foreground"> (you)</span>}
                            </a>
                            <span className="text-xs text-muted-foreground">{m.email}</span>
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className={tc.cell}>
                        <RoleCell m={m} canEdit={isAdmin} />
                      </TableCell>
                      <TableCell className={tc.cell}>
                        <span className="flex items-center gap-2">
                          <Icon name={tm.icon} className="size-3.25" />
                          {tm.name}
                        </span>
                      </TableCell>
                      <TableCell className={cn(tc.cell, 'text-center tabular-nums')}>
                        {ps.filter(p => p.members.includes(m.id) && p.status !== 'complete').length}
                      </TableCell>
                      <TableCell className={cn(tc.cell, 'text-center tabular-nums')}>
                        {ts.filter(t => t.assignee === m.id && t.status !== 'done').length}
                      </TableCell>
                      <TableCell className={cn(tc.cell, 'text-fg-2')}>
                        {m.last == null ? '—' : m.last < 5 ? <span className="text-green">Online</span> : ago(minsAgo(m.last))}
                      </TableCell>
                      <TableCell className={tc.cell}>
                        <MemberStatus m={m} />
                      </TableCell>
                      <TableCell className={tc.cell}>
                        <MemberMenu id={m.id}>
                          <Button variant="ghost" size="icon-sm" className="relative z-10" aria-label={`Options for ${m.name}`}>
                            <Ellipsis />
                          </Button>
                        </MemberMenu>
                      </TableCell>
                    </TableRow>
                  </MemberContextMenu>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <Empty icon={SearchX} title="No results found" text="No members match that search." className="py-8" />
        )}
      </Panel>
    </>
  );
}

export function MembersPage() {
  const d = useStore(s => s.data);
  const tab = useStore(s => s.ui.membersTab);
  return (
    <Page className="max-w-300">
      <PageHeader title="Members" sub={`${d.members.length} people in ${d.ws.name} · ${d.members.filter(m => m.status === 'invited').length} pending`}>
        <Button onClick={invite}>
          <UserPlus />
          Invite member
        </Button>
      </PageHeader>
      <LineTabs
        label="Members"
        className="mb-3.5"
        value={tab}
        onChange={v => setUi('membersTab', v)}
        items={[
          { value: 'members', label: 'Members' },
          { value: 'teams', label: 'Teams' },
          { value: 'roles', label: 'Roles & permissions' },
        ]}
      />
      {tab === 'teams' ? (
        <>
          <div className="mb-3 flex items-center">
            <span className="text-[13px] text-fg-2">{`${d.teams.length} teams`}</span>
            <Button variant="outline" size="sm" className="ml-auto" onClick={newTeam}>
              <Plus />
              New team
            </Button>
          </div>
          <TeamsGrid />
        </>
      ) : tab === 'roles' ? (
        <PermsTable />
      ) : (
        <Directory />
      )}
    </Page>
  );
}
