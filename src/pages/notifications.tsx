import { BellOff, Check, CheckCheck, Mail, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ago, dayBucket } from '../domain/date';
import { linkTo } from '../shell/shell';
import { setUi, useStore } from '../store';
import { CommentText, Empty, Tag, Tip } from '../ui/helpers';
import { DayHeading, Page, PageHeader, Panel, Seg, groupBy, stretched } from './kit';
import { NotifIcon, NotifText, markAllRead, notifSubject, openNotif, toggleRead } from './notifs';

export function NotificationsPage() {
  const d = useStore(s => s.data);
  const f = useStore(s => s.ui.notifFilter);
  const all = d.notifs.toSorted((a, b) => b.at - a.at);
  const unread = all.filter(n => !n.read).length;
  const ns = f === 'unread' ? all.filter(n => !n.read) : all;
  const buckets = groupBy(ns, n => dayBucket(n.at));
  return (
    <Page className="max-w-205">
      <PageHeader
        title={
          <span className="flex items-center gap-2.5">
            Notifications
            {!!unread && <Tag tone="primary">{`${unread} unread`}</Tag>}
          </span>
        }
        sub="Updates on tasks and projects you follow."
      >
        <Seg
          label="Show"
          value={f}
          onChange={v => setUi('notifFilter', v)}
          items={[
            { value: 'all', label: 'All' },
            { value: 'unread', label: 'Unread' },
          ]}
        />
        <Button variant="outline" disabled={!unread} onClick={markAllRead}>
          <CheckCheck />
          Mark all as read
        </Button>
        <Tip label="Notification preferences">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notification preferences"
            nativeButton={false}
            render={<a {...linkTo({ r: 'settings', sec: 'notif-email' })} />}
          >
            <Settings2 />
          </Button>
        </Tip>
      </PageHeader>
      {ns.length ? (
        buckets.map(([b, list]) => (
          <section key={b} aria-label={b}>
            <DayHeading>{b}</DayHeading>
            <Panel>
              <ul>
                {list.map(n => {
                  const { p } = notifSubject(d, n);
                  return (
                    <li
                      key={n.id}
                      className={cn(
                        'relative flex items-start gap-3 px-3.5 py-2.75 transition-colors not-first:border-t not-first:border-divider hover:bg-muted',
                        !n.read && 'bg-primary/4',
                      )}
                    >
                      <NotifIcon n={n} />
                      <div className="min-w-0 flex-1 text-base">
                        <button className={cn(stretched, 'block')} onClick={() => openNotif(n.id)}>
                          <NotifText d={d} n={n} />
                        </button>
                        <div className="mt-0.5 truncate text-sm text-fg-2">
                          <CommentText text={n.snippet} />
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{`${p ? p.name + ' · ' : ''}${ago(n.at)}`}</div>
                      </div>
                      {!n.read && <span className="mt-2 size-1.75 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                      <Tip label={n.read ? 'Mark as unread' : 'Mark as read'}>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="relative z-10"
                          aria-label={n.read ? 'Mark as unread' : 'Mark as read'}
                          onClick={() => toggleRead(n.id)}
                        >
                          {n.read ? <Mail /> : <Check />}
                        </Button>
                      </Tip>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </section>
        ))
      ) : (
        <Panel>
          <Empty icon={BellOff} title="You're all caught up." text="No unread notifications. We'll let you know when something needs you.">
            <Button variant="outline" size="sm" onClick={() => setUi('notifFilter', 'all')}>
              Show all
            </Button>
          </Empty>
        </Panel>
      )}
    </Page>
  );
}
