import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { newTeam, useStore } from '../store';
import { Empty } from '../ui/helpers';
import { Page, PageHeader, Panel } from './kit';
import { TeamsGrid } from './teams-grid';

export function TeamsPage() {
  const n = useStore(s => s.data.teams.length);
  return (
    <Page>
      <PageHeader title="Teams" sub="Groups of people who work on projects together.">
        <Button onClick={newTeam}>
          <Plus />
          New team
        </Button>
      </PageHeader>
      {n ? (
        <TeamsGrid />
      ) : (
        <Panel>
          <Empty icon={Users} title="No teams yet" text="Create a team to group people and give projects an owner.">
            <Button size="sm" onClick={newTeam}>
              <Plus />
              New team
            </Button>
          </Empty>
        </Panel>
      )}
    </Page>
  );
}
