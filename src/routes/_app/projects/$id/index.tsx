import { createFileRoute, redirect } from '@tanstack/react-router';
import { get } from '../../../../store';

/** A project link without a tab opens the preferred default tab, keeping a copied link's query. */
export const Route = createFileRoute('/_app/projects/$id/')({
  beforeLoad: ({ params, search }) => {
    throw redirect({ to: '/projects/$id/$tab', params: { id: params.id, tab: get().prefs.defaultTab ?? 'board' }, search, replace: true });
  },
});
