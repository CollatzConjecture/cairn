import { createFileRoute } from '@tanstack/react-router';
import { memberId } from '../../../domain/ids';
import { MemberPage } from '../../../pages/member';

export const Route = createFileRoute('/_app/members/$id')({
  component: function MemberRoute() {
    return <MemberPage id={memberId(Route.useParams().id)} />;
  },
});
