import { Outlet, createFileRoute } from '@tanstack/react-router';
import { Shell } from '../shell/shell';

/** Every in-app page renders inside the shell; auth and onboarding routes sit outside it. */
export const Route = createFileRoute('/_app')({
  component: () => (
    <Shell>
      <Outlet />
    </Shell>
  ),
});
