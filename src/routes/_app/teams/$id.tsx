import { createFileRoute } from '@tanstack/react-router';
import { teamId } from '../../../domain/ids';
import { TeamPage } from '../../../pages/team';

export const Route = createFileRoute('/_app/teams/$id')({
  component: function TeamRoute() {
    return <TeamPage id={teamId(Route.useParams().id)} />;
  },
});
