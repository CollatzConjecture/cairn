import { Check, Minus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ROLES } from '../domain/constants';
import { Panel, tc } from './kit';

/** What each role may do, in `ROLES` order (Owner, Admin, Member, Guest). */
const PERMS: readonly [string, boolean, boolean, boolean, boolean][] = [
  ['View projects & tasks', true, true, true, true],
  ['Comment on tasks', true, true, true, true],
  ['Create and edit tasks', true, true, true, false],
  ['Create projects', true, true, true, false],
  ['Invite members', true, true, false, false],
  ['Manage roles', true, true, false, false],
  ['Workspace settings', true, true, false, false],
  ['Billing', true, false, false, false],
  ['Delete workspace', true, false, false, false],
];

/** The role permission matrix (Members › Roles, Settings › Permissions). */
export function PermsTable() {
  return (
    <Panel>
      <Table className={cn(tc.table, 'min-w-140')} aria-label="Role permissions">
        <TableHeader>
          <TableRow className={tc.row}>
            <TableHead className={tc.head}>Permission</TableHead>
            {ROLES.map(r => (
              <TableHead key={r} className={cn(tc.head, 'text-center')}>
                {r}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {PERMS.map(([name, ...allowed]) => (
            <TableRow key={name} className={cn(tc.row, 'last:border-b-0')}>
              <TableCell className={tc.cell}>{name}</TableCell>
              {allowed.map((ok, i) => (
                <TableCell key={ROLES[i]} className={cn(tc.cell, 'text-center')}>
                  {ok ? (
                    <Check className="inline size-3.75 text-green" aria-label="Allowed" />
                  ) : (
                    <Minus className="inline size-3.75 text-muted-foreground" aria-label="Not allowed" />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Panel>
  );
}
