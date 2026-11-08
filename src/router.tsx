import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { StateFailed } from './shell/errors';

export const router = createRouter({
  routeTree,
  defaultErrorComponent: ({ reset }) => <StateFailed reset={reset} />,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
