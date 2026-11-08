import { createFileRoute } from '@tanstack/react-router';
import { SettingsPage } from '../../../settings/settings';

export const Route = createFileRoute('/_app/settings/$sec')({
  component: function SettingsRoute() {
    return <SettingsPage sec={Route.useParams().sec} />;
  },
});
