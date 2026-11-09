import { ArrowLeft, AtSign, CheckCheck, Inbox, Mail, MailOpen, MessageSquare, PanelRightOpen, RefreshCw, TriangleAlert, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { CellAssignee, CellDue, CellPriority, CellStatus } from '../components/task-list';
import { MOD } from '../domain/constants';
import { ago } from '../domain/date';
import type { TaskId } from '../domain/ids';
import type { Data, Notif } from '../domain/schema';
import { CommentItem } from '../overlays/comment';
import { commentsOf, go, openTask, pColor, postComment, set, setDraft, setUi, useStore, type Ui } from '../store';
import { CommentText, Dot, Empty, Tip } from '../ui/helpers';
import { Callout, Eyebrow, LineTabs, stretched } from './kit';
import { NotifIcon, NotifText, markAllRead, notifSubject, selNotif, toggleRead } from './notifs';

type Cat = Ui['inboxCat'];
const CATS: readonly [Cat, string][] = [
  ['all', 'All'],
  ['mention', 'Mentions'],
  ['assign', 'Assignments'],
  ['comment', 'Comments'],
  ['update', 'Updates'],
];
const TYPE_ICON = { mention: AtSign, assign: UserPlus, comment: MessageSquare, update: RefreshCw };

function InboxItem({ d, n, on }: { d: Data; n: Notif; on: boolean }) {
  const { p } = notifSubject(d, n);
  const T = TYPE_ICON[n.type];
  return (
    <li className={cn('relative flex items-start gap-2.5 border-b border-divider px-(--gutter) py-3 transition-colors hover:bg-muted', on && 'bg-muted')}>
      {!n.read && <span className="absolute top-5.5 left-1.5 size-1.5 rounded-full bg-primary" aria-label="Unread" />}
      <NotifIcon n={n} />
      <div className="min-w-0 flex-1 text-[13px] leading-[1.45]">
        <button className={cn(stretched, 'block')} onClick={() => selNotif(n.id)} aria-current={on || undefined}>
          <NotifText d={d} n={n} />
        </button>
        <div className="mt-0.5 truncate text-sm text-fg-2">
          <CommentText text={n.snippet} />
        </div>
        <div className="mt-1.25 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <T className="size-2.75" />
          {p && (
            <>
              <Dot c={pColor(p)} round className="size-1.5" />
              {p.name}
            </>
          )}
          <span>·</span>
          <span>{ago(n.at)}</span>
        </div>
      </div>
      <Tip label={n.read ? 'Mark as unread' : 'Mark as read'}>
        <Button
          variant="ghost"
          size="icon-xs"
          className="relative z-10"
          aria-label={n.read ? 'Mark as unread' : 'Mark as read'}
          onClick={() => toggleRead(n.id)}
        >
          {n.read ? <Mail /> : <MailOpen />}
        </Button>
      </Tip>
    </li>
  );
}

const closePreview = () =>
  set(s => {
    s.ui.inboxSel = null;
  });

function Reply({ tid }: { tid: TaskId }) {
  const draft = useStore(s => s.ui.drafts[tid] ?? '');
  return (
    <div className="mt-2.5 flex flex-col gap-1.5 rounded-md border border-input bg-background px-2.5 py-2 transition-[border-color,box-shadow] focus-within:border-primary focus-within:ring-3 focus-within:ring-primary-soft">
      <Textarea
        className="field-sizing-content min-h-10 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
        placeholder="Reply… use @ to mention"
        aria-label="Reply"
        value={draft}
        onChange={e => setDraft(tid, e.currentTarget.value, e.currentTarget.selectionStart)}
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            postComment(tid);
          }
        }}
      />
      <div className="flex items-center">
        <span className="text-[11.5px] text-muted-foreground">{`${MOD}+Enter to send`}</span>
        <Button size="sm" className="ml-auto" onClick={() => postComment(tid)}>
          Reply
        </Button>
      </div>
    </div>
  );
}

function Preview({ d, n }: { d: Data; n: Notif }) {
  const { t, p } = notifSubject(d, n);
  if (!t)
    return (
      <div className="px-7 py-6">
        <Button variant="ghost" size="sm" className="-mt-1 mb-3 -ml-2" onClick={closePreview}>
          <ArrowLeft />
          Back
        </Button>
        <Callout tone="danger" icon={TriangleAlert}>
          <b className="font-semibold">{n.text}</b>
          <div className="mt-0.5 text-fg-2">{n.snippet}</div>
        </Callout>
        {p && (
          <Button variant="outline" className="mt-3.5" onClick={() => go({ r: 'project', id: p.id, tab: 'overview' })}>
            Open project
          </Button>
        )}
      </div>
    );
  const cs = commentsOf(d, t.id).slice(-4);
  return (
    <>
      <div className="flex h-11.5 shrink-0 items-center gap-2 border-b px-4">
        <Button variant="ghost" size="icon-sm" aria-label="Back" onClick={closePreview}>
          <ArrowLeft />
        </Button>
        <Dot c={pColor(p)} />
        <span className="text-sm text-fg-2">{p?.name}</span>
        <span className="font-mono text-xs text-muted-foreground">{t.key}</span>
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => openTask(t.id)}>
          <PanelRightOpen />
          Open task
        </Button>
      </div>
      <div className="w-full max-w-180 px-7 py-6 max-sm:px-4">
        <h2 className="mb-2.5 text-xl font-semibold tracking-[-0.015em]">{t.title}</h2>
        <div className="mb-4.5 flex flex-wrap gap-1">
          <CellStatus t={t} />
          <CellAssignee t={t} />
          <CellPriority t={t} />
          <CellDue t={t} />
        </div>
        <Eyebrow className="mb-1">Conversation</Eyebrow>
        {cs.length ? cs.map(c => <CommentItem key={c.id} c={c} />) : <p className="text-fg-2">{n.snippet}</p>}
        <Reply tid={t.id} />
      </div>
    </>
  );
}

export function InboxPage() {
  const d = useStore(s => s.data);
  const cat = useStore(s => s.ui.inboxCat);
  const unreadOnly = useStore(s => s.ui.inboxUnread);
  const selId = useStore(s => s.ui.inboxSel);
  const all = d.notifs.toSorted((a, b) => b.at - a.at);
  const count = (k: Cat) => all.filter(n => (k === 'all' || n.type === k) && !n.read).length;
  const ns = all.filter(n => (cat === 'all' || n.type === cat) && (!unreadOnly || !n.read));
  const sel = d.notifs.find(n => n.id === selId) ?? null;
  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,420px)_minmax(0,1fr)] max-md:grid-cols-1">
      <div className="flex min-h-0 flex-col border-r max-md:border-r-0">
        <div className="flex items-center gap-2 px-(--gutter) pt-4.5">
          <h1 className="text-xl font-semibold tracking-[-0.015em]">Inbox</h1>
          <Label className="ml-auto gap-1.5 text-xs font-normal text-fg-2">
            <Switch
              checked={unreadOnly}
              onCheckedChange={v =>
                set(s => {
                  s.ui.inboxUnread = v;
                })
              }
            />
            Unread
          </Label>
          <Tip label="Mark all as read">
            <Button variant="ghost" size="icon-sm" aria-label="Mark all as read" onClick={markAllRead}>
              <CheckCheck />
            </Button>
          </Tip>
        </div>
        <LineTabs
          label="Inbox categories"
          value={cat}
          onChange={v => setUi('inboxCat', v)}
          items={CATS.map(([k, n]) => {
            const c = count(k);
            return { value: k, label: n, count: c || undefined };
          })}
          className="mt-2 px-(--gutter)"
          listClassName="gap-4"
          itemClassName="px-0 group-data-horizontal/tabs:after:inset-x-0"
        />
        <div className="min-h-0 flex-1 [scrollbar-width:none] overflow-y-auto">
          {ns.length ? (
            <ul aria-label="Notifications">
              {ns.map(n => (
                <InboxItem key={n.id} d={d} n={n} on={sel?.id === n.id} />
              ))}
            </ul>
          ) : (
            <Empty
              icon={Inbox}
              title="You're all caught up."
              text={unreadOnly ? 'No unread notifications in this category.' : 'New mentions, assignments, and comments will show up here.'}
              className="py-10"
            />
          )}
        </div>
      </div>
      <div className={cn('flex min-h-0 flex-col overflow-y-auto max-md:fixed max-md:inset-0 max-md:z-48 max-md:bg-background', !sel && 'max-md:hidden')}>
        {sel ? (
          <Preview d={d} n={sel} />
        ) : (
          <Empty icon={MailOpen} title="Select a notification" text="Read the conversation and reply without leaving your inbox." className="flex-1" />
        )}
      </div>
    </div>
  );
}
