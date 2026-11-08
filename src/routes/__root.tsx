import { Outlet, createRootRoute } from '@tanstack/react-router';
import { Fragment } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Layer } from '../overlays/layer';
import { useDocumentTitle } from '../shell/document';
import { Page404 } from '../shell/errors';
import { Shell } from '../shell/shell';
import { useStore } from '../store';

function Root() {
  useDocumentTitle();
  // Date helpers read the format from a module setting, so a format change remounts the tree to re-render every date.
  const dateFmt = useStore(s => s.prefs.dateFmt);
  return (
    <TooltipProvider>
      <Fragment key={dateFmt}>
        <Outlet />
      </Fragment>
      <Layer />
      <Toaster />
    </TooltipProvider>
  );
}

export const Route = createRootRoute({
  component: Root,
  notFoundComponent: () => (
    <Shell>
      <Page404 />
    </Shell>
  ),
});
