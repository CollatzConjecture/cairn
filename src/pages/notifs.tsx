/* Notification rendering and read state shared by Inbox and Notifications. */
import { Clock, TriangleAlert } from 'lucide-react';
import type { NotifId } from '../domain/ids';
import type { Data, Notif } from '../domain/schema';
import { go, memberById, openTask, projectById, set, taskById, toast, get } from '../store';
import { Avatar } from '../ui/helpers';

/** The task and project a notification is about. */
export function notifSubject(d: Data, n: Notif) {
  const t = taskById(d, n.task);
  const p = projectById(d, n.project ?? t?.project);
  return { t, p };
}

/** Who, what, and the task, or the alert text for system notifications. */
export function NotifText({ d, n }: { d: Data; n: Notif }) {
  const { t, p } = notifSubject(d, n);
  if (!n.by && p && !t) return <b className="font-semibold">{n.text}</b>;
  if (!n.by && t)
    return (
      <>
        <b className="font-semibold">{t.title}</b> <span className="text-fg-2">{n.text}</span>
      </>
    );
  return (
    <>
      {n.by && <b className="font-semibold">{memberById(d, n.by)?.name}</b>} <span className="text-fg-2">{n.text}</span>{' '}
      {t && <b className="font-medium">{t.title}</b>}
    </>
  );
}

/** The sender's avatar, or an alert glyph for system notifications (red for a project, amber for a due task). */
export function NotifIcon({ n }: { n: Notif }) {
  if (n.by) return <Avatar id={n.by} size="md" tip={false} className="mt-px" />;
  const I = n.type === 'update' && n.project ? TriangleAlert : Clock;
  return (
    <span
      className="mt-px grid size-6.5 shrink-0 place-items-center rounded-full avatar-tint ring-[1.5px] ring-background"
      style={{ '--c': n.project ? 'var(--red)' : 'var(--amber)' }}
    >
      <I className="size-3.25" />
    </span>
  );
}

const write = (id: NotifId, fn: (n: Notif) => void) =>
  set(s => {
    const n = s.data.notifs.find(x => x.id === id);
    if (n) fn(n);
  });
export const toggleRead = (id: NotifId) => write(id, n => (n.read = !n.read));
/** Inbox: mark read and show it in the preview pane. */
export function selNotif(id: NotifId) {
  write(id, n => (n.read = true));
  set(s => {
    s.ui.inboxSel = id;
  });
}
/** Notifications: mark read and open what it is about. */
export function openNotif(id: NotifId) {
  write(id, n => (n.read = true));
  const n = get().data.notifs.find(x => x.id === id);
  if (n?.task) openTask(n.task);
  else if (n?.project) go({ r: 'project', id: n.project, tab: 'overview' });
}
export function markAllRead() {
  const n = get().data.notifs.filter(x => !x.read).length;
  set(s => s.data.notifs.forEach(x => (x.read = true)));
  if (n) toast("You're all caught up.");
}
