import { createFileRoute, redirect } from '@tanstack/react-router';
import { get } from '../store';

const HOME = { home: '/home', mytasks: '/my-tasks', inbox: '/inbox' } as const;

/** `/` opens the start page chosen in Preferences. */
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: HOME[get().prefs.home], replace: true });
  },
});
