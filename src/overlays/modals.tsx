/* Every modal in `ui.modals`, each its own shadcn Dialog, later ones on top. Escape and the scrim close the
   topmost, because focus is trapped inside it and Base UI dismisses only the dialog the key or press belongs to. */
import { useRef, useState, type ReactNode } from 'react';
import { Archive, Building2, CircleAlert, Info, Link, Lock, Trash } from 'lucide-react';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { FT, PCOLORS, PERMS, ROLES, SHORTCUTS, type Perm } from '../domain/constants';
import { ago } from '../domain/date';
import { memberId, uid, viewId, type MemberId, type ProjectId, type TeamId } from '../domain/ids';
import type { Member } from '../domain/schema';
import { TeamModal } from '../pages/team-modal';
import {
  closeModal,
  confirmOk,
  copyInviteLink,
  copyLink,
  get,
  go,
  memberById,
  mutate,
  openTask,
  projectById,
  promptSubmit,
  restore,
  set,
  snapshot,
  taskById,
  toast,
  useStore,
  viewOf,
  type Modal,
  type RichText,
} from '../store';
import { Avatar, FilePreview } from '../ui/helpers';
import { Icon } from '../ui/icon';
import { ModalFrame, modalPlace } from './modal-frame';
import { ProjectModal } from './project-modal';
import { TaskModal } from './task-modal';

type Of<T extends Modal['type']> = Extract<Modal, { type: T }>;

const fieldLabel = 'text-sm font-medium';
const eyebrow = 'text-2xs font-semibold tracking-[0.07em] text-muted-foreground uppercase';
const EMAIL = /^\S+@\S+\.\S+$/;
const nameFromEmail = (e: string) => (e.split('@')[0] ?? '').replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function Rich({ body }: { body: RichText }) {
  if (typeof body === 'string') return body;
  return body.map((part, i) =>
    typeof part === 'string' ? (
      part
    ) : (
      <b key={i} className="font-semibold text-foreground">
        {part.b}
      </b>
    ),
  );
}

function ConfirmModal({ m }: { m: Of<'confirm'> }) {
  const text = useStore(s => s.ui.confirmText);
  const ok = !m.typeName || text === m.typeName;
  return (
    <AlertDialogContent
      className={cn(
        'flex flex-col gap-0 p-0 data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-105',
        modalPlace('sm'),
        'max-sm:data-[size=default]:max-w-full',
      )}
    >
      <div className="flex flex-col gap-2.5 px-4 pt-4.5 pb-3.5">
        <div className="flex items-start gap-3">
          <span
            className="grid size-8.5 shrink-0 place-items-center rounded-[9px] bg-(--c)/14 text-tint"
            style={{ '--c': m.danger ? 'var(--red)' : 'var(--amber)' }}
            aria-hidden="true"
          >
            {m.icon ? <Icon name={m.icon} className="size-4.25" /> : m.danger ? <Trash className="size-4.25" /> : <Archive className="size-4.25" />}
          </span>
          <div className="min-w-0 flex-1">
            <AlertDialogTitle className="mt-1 mb-1.5 text-[15px] font-semibold">{m.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] leading-[1.55] text-balance text-fg-2">
              <Rich body={m.body} />
            </AlertDialogDescription>
          </div>
        </div>
        {m.typeName && (
          <div className="mt-1.5 flex flex-col gap-1.5">
            <label className="text-sm text-fg-2" htmlFor="confirm-in">
              Type <b className="font-semibold text-foreground">{m.typeName}</b> to confirm
            </label>
            <Input
              id="confirm-in"
              autoComplete="off"
              autoFocus
              value={text}
              onChange={e => {
                const v = e.currentTarget.value;
                set(s => {
                  s.ui.confirmText = v;
                });
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  confirmOk();
                }
              }}
            />
          </div>
        )}
      </div>
      <AlertDialogFooter className="mx-0 mb-0 flex-row items-center justify-end rounded-none bg-transparent px-4 py-3">
        <AlertDialogCancel autoFocus={!m.typeName}>Cancel</AlertDialogCancel>
        <Button variant={m.danger ? 'danger' : 'default'} disabled={!ok} onClick={confirmOk}>
          {m.ok}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

function PromptModal({ m }: { m: Of<'prompt'> }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <ModalFrame
      size="sm"
      title={m.title}
      initialFocus={ref}
      onSubmit={() => promptSubmit(ref.current?.value ?? '')}
      footer={
        <>
          <span className="flex-1" />
          <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
          <Button type="submit">{m.ok || 'Save'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-1.5">
        <label className={fieldLabel} htmlFor="prompt-in">
          {m.label}
        </label>
        <Input ref={ref} id="prompt-in" defaultValue={m.value} onFocus={e => e.currentTarget.select()} />
      </div>
    </ModalFrame>
  );
}

function ShortcutsModal() {
  return (
    <ModalFrame size="lg" title="Keyboard shortcuts" bodyClassName="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5.5">
      {SHORTCUTS.map(([group, list]) => (
        <div key={group}>
          <div className={cn(eyebrow, 'mb-1.5')}>{group}</div>
          {list.map(([name, keys]) => (
            <div key={name} className="flex h-7.5 items-center gap-1 border-b border-divider text-[13px]">
              <span className="flex-1">{name}</span>
              {keys.map((k, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && keys[0] === 'G' && <span className="text-2xs text-muted-foreground">then</span>}
                  <Kbd>{k}</Kbd>
                </span>
              ))}
            </div>
          ))}
        </div>
      ))}
    </ModalFrame>
  );
}

function FilePreviewModal({ m }: { m: Of<'filePreview'> }) {
  const f = m.file;
  const d = useStore(s => s.data);
  const t = taskById(d, m.tid);
  return (
    <ModalFrame
      size="lg"
      title={f.name}
      sub={`${FT[f.type].n} · ${f.size} · Uploaded by ${memberById(d, f.by)?.name ?? 'you'} ${ago(f.at)}`}
      footer={
        <>
          <Button variant="outline" onClick={() => copyLink({ file: f.id })}>
            <Link />
            Copy link
          </Button>
          <span className="flex-1" />
          <DialogClose render={<Button />}>Close</DialogClose>
        </>
      }
    >
      <div className="overflow-hidden rounded-lg border">
        <FilePreview f={f} size="lg" className="aspect-video rounded-none" />
      </div>
      {t && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link className="size-3.25" />
          Attached to
          <button className="font-medium text-primary hover:underline hover:underline-offset-3" onClick={() => openTask(t.id)}>
            {t.title}
          </button>
        </div>
      )}
    </ModalFrame>
  );
}

const LAYOUTS = [
  { value: 'list', label: 'List' },
  { value: 'board', label: 'Board' },
  { value: 'table', label: 'Table' },
] as const;
type Layout = (typeof LAYOUTS)[number]['value'];

function SaveViewModal({ m }: { m: Of<'saveView'> }) {
  const name = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<Layout>('list');
  const submit = () => {
    const id = viewId(uid('v'));
    const label = name.current?.value.trim() || 'Untitled view';
    const filters = structuredClone(viewOf(get().views, get().data, `p:${m.pid}`).filters);
    if (!mutate(s => void s.data.savedViews.push({ id, project: m.pid, name: label, type, filters }))) return;
    closeModal();
    go({ r: 'project', id: m.pid, tab: `v:${id}` });
    toast(`Saved view “${label}”`);
  };
  return (
    <ModalFrame
      size="sm"
      title="Save view"
      sub="Save the current filters as a tab on this project."
      initialFocus={name}
      onSubmit={submit}
      footer={
        <>
          <span className="flex-1" />
          <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
          <Button type="submit">Save view</Button>
        </>
      }
    >
      <div className="flex flex-col gap-1.5">
        <label className={fieldLabel} htmlFor="sv-name">
          View name
        </label>
        <Input ref={name} id="sv-name" placeholder="e.g. Design review queue" />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className={fieldLabel} id="sv-type-l">
          Layout
        </span>
        <Select items={LAYOUTS} value={type} onValueChange={v => v && setType(v)}>
          <SelectTrigger className="w-full" aria-labelledby="sv-type-l">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LAYOUTS.map(l => (
              <SelectItem key={l.value} value={l.value}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {m.nf ? (
        <p className="text-xs text-muted-foreground">{`${m.nf} filter${m.nf > 1 ? 's' : ''} will be saved with this view.`}</p>
      ) : (
        <InfoNote>No filters are active — the view will show all tasks. You can add filters after saving.</InfoNote>
      )}
    </ModalFrame>
  );
}

function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-md bg-primary-soft px-3 py-2.5 text-sm">
      <Info className="mt-px size-3.5 shrink-0 text-primary" />
      <span>{children}</span>
    </div>
  );
}

const ROLE_ITEMS = ROLES.filter(r => r !== 'Owner').map(r => ({ value: r, label: r }));

function InviteModal() {
  const d = useStore(s => s.data);
  const draft = useStore(s => s.ui.inviteDraft);
  const err = useStore(s => s.ui.errors.invite);
  const [role, setRole] = useState<Member['role']>('Member');
  const teams = d.teams.map(t => ({ value: t.id, label: t.name }));
  const [team, setTeam] = useState<TeamId | null>(teams[0]?.value ?? null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const submit = () => {
    const list = draft
      .split(/[\s,;]+/)
      .map(s => s.trim())
      .filter(Boolean);
    const bad = list.find(e => !EMAIL.test(e));
    const error = !list.length ? 'Enter at least one email address' : bad ? `${bad} isn't a valid email address` : null;
    set(s => {
      s.ui.errors.invite = error;
    });
    if (error) return ref.current?.focus();
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      const ok = mutate(s =>
        list.forEach(e => {
          if (s.data.members.some(x => x.email === e)) return;
          s.data.members.push({
            id: memberId(uid('m')),
            name: nameFromEmail(e),
            email: e,
            role,
            team,
            title: role,
            c: PCOLORS.slate,
            status: 'invited',
            last: null,
            tz: '—',
          });
        }),
      );
      if (!ok) return;
      closeModal();
      toast(`${list.length} invitation${list.length > 1 ? 's' : ''} sent`);
    }, 600);
  };
  return (
    <ModalFrame
      title={`Invite to ${d.ws.name}`}
      sub="Invited people get an email with a link to join."
      initialFocus={ref}
      onSubmit={submit}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={() => void copyInviteLink()}>
            <Link />
            Copy invite link
          </Button>
          <span className="flex-1" />
          <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
          <Button type="submit" disabled={busy}>
            {busy && <Spinner className="size-3.5" />}
            Send invites
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-1.5">
        <label className={fieldLabel} htmlFor="inv-emails">
          Email addresses
        </label>
        <Textarea
          ref={ref}
          id="inv-emails"
          rows={3}
          className="min-h-18"
          placeholder="name@company.com, another@company.com"
          aria-invalid={!!err}
          aria-describedby="inv-hint"
          value={draft}
          onChange={e => {
            const v = e.currentTarget.value;
            set(s => {
              s.ui.inviteDraft = v;
            });
          }}
        />
        <span id="inv-hint" className={cn('flex items-center gap-1 text-xs', err ? 'text-destructive' : 'text-muted-foreground')}>
          {err && <CircleAlert className="size-3" />}
          {err || 'Separate multiple addresses with commas.'}
        </span>
      </div>
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <span className={fieldLabel} id="inv-role-l">
            Role
          </span>
          <Select items={ROLE_ITEMS} value={role} onValueChange={v => v && setRole(v)}>
            <SelectTrigger className="w-full" aria-labelledby="inv-role-l">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_ITEMS.map(r => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <span className={fieldLabel} id="inv-team-l">
            Team
          </span>
          <Select items={teams} value={team} onValueChange={v => setTeam(v)}>
            <SelectTrigger className="w-full" aria-labelledby="inv-team-l">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {teams.map(t => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <InfoNote>
        <b className="font-semibold">Guests</b> can only see projects they're added to and can't create projects.
      </InfoNote>
    </ModalFrame>
  );
}

/* ---------- share ---------- */
const PERM_ITEMS = PERMS.map(p => ({ value: p, label: p }));
const REMOVE = 'remove';
const MEMBER_PERM_ITEMS = [...PERM_ITEMS, { value: REMOVE, label: 'Remove access' }];
const ACCESS_ITEMS = (ws: string) => [
  { value: 'private', label: 'Only people invited' },
  { value: 'workspace', label: `Everyone at ${ws}` },
];

function shareAdd(pid: ProjectId, mid: MemberId) {
  const p = projectById(get().data, pid);
  const m = memberById(get().data, mid);
  if (!p || !m) return;
  mutate(s => {
    projectById(s.data, pid)?.members.push(mid);
    s.ui.shareQ = '';
  });
  toast(`${m.name} can now edit ${p.name}`);
}
function shareInvite(pid: ProjectId, v: string, perm: Perm): boolean {
  const d = get().data;
  const ex = d.members.find(x => x.email.toLowerCase() === v.toLowerCase() || x.name.toLowerCase() === v.toLowerCase());
  if (ex) {
    mutate(s => {
      const p = projectById(s.data, pid);
      if (!p || p.members.includes(ex.id)) return;
      p.members.push(ex.id);
      p.perms = { ...p.perms, [ex.id]: perm };
    });
    set(s => void (s.ui.shareQ = ''));
    toast(`Shared with ${ex.name}`);
    return true;
  }
  if (!EMAIL.test(v)) {
    toast('Enter a valid email address, like name@company.com', { kind: 'err' });
    return false;
  }
  mutate(s => {
    const p = projectById(s.data, pid);
    if (!p) return;
    const id = memberId(uid('m'));
    s.data.members.push({
      id,
      name: nameFromEmail(v),
      email: v,
      role: 'Guest',
      team: p.team,
      title: 'Guest',
      c: PCOLORS.slate,
      status: 'invited',
      last: null,
      tz: '—',
    });
    p.members.push(id);
    p.perms = { ...p.perms, [id]: perm };
  });
  set(s => void (s.ui.shareQ = ''));
  toast(`Invitation sent to ${v}`);
  return true;
}
function setPerm(pid: ProjectId, mid: MemberId, v: string) {
  const m = memberById(get().data, mid);
  if (v === REMOVE) {
    const snap = snapshot();
    if (
      mutate(s => {
        const p = projectById(s.data, pid);
        if (p) p.members = p.members.filter(x => x !== mid);
      })
    )
      toast(`Removed ${m?.name}`, { action: 'Undo', onAction: () => restore(snap) });
    return;
  }
  const perm = PERMS.find(x => x === v);
  if (!perm) return;
  const ok = mutate(s => {
    const p = projectById(s.data, pid);
    if (p) p.perms = { ...p.perms, [mid]: perm };
  });
  if (ok) toast(`${m?.name}: ${perm}`, { ms: 1800 });
}

function ShareModal({ id }: { id: ProjectId }) {
  const d = useStore(s => s.data);
  const q = useStore(s => s.ui.shareQ);
  const [perm, setPermDraft] = useState<Perm>('Can edit');
  const input = useRef<HTMLInputElement>(null);
  const p = projectById(d, id);
  if (!p) return null;
  const access = p.access ?? 'workspace';
  const ql = q.toLowerCase();
  const matches = d.members.filter(x => !p.members.includes(x.id) && (x.name.toLowerCase().includes(ql) || x.email.includes(ql)));
  return (
    <ModalFrame
      title={`Share “${p.name}”`}
      initialFocus={input}
      footer={
        <>
          <Button variant="outline" onClick={() => copyLink({ project: p.id })}>
            <Link />
            Copy link
          </Button>
          <span className="flex-1" />
          <DialogClose render={<Button />}>Done</DialogClose>
        </>
      }
    >
      <form
        className="flex gap-1.5"
        onSubmit={e => {
          e.preventDefault();
          const v = q.trim();
          if (!v) return input.current?.focus();
          shareInvite(p.id, v, perm);
        }}
      >
        <Input
          ref={input}
          className="flex-1"
          placeholder="Add people by name or email"
          aria-label="Invite by email"
          value={q}
          onChange={e => {
            const v = e.currentTarget.value;
            set(s => void (s.ui.shareQ = v));
          }}
        />
        <Select items={PERM_ITEMS} value={perm} onValueChange={v => v && setPermDraft(v)}>
          <SelectTrigger className="w-33" aria-label="Permission">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERM_ITEMS.map(x => (
              <SelectItem key={x.value} value={x.value}>
                {x.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit">Invite</Button>
      </form>
      {q && (
        <div className="rounded-lg border p-1">
          {matches.length ? (
            matches.map(x => (
              <button
                key={x.id}
                className="flex min-h-7.5 w-full items-center gap-2.25 rounded-md px-2 text-left text-base hover:bg-muted"
                onClick={() => shareAdd(p.id, x.id)}
              >
                <Avatar id={x.id} size="sm" tip={false} />
                {x.name}
                <span className="ml-auto text-xs text-muted-foreground">{x.email}</span>
              </button>
            ))
          ) : (
            <div className="flex min-h-7.5 items-center px-2 text-base text-muted-foreground">
              {q.includes('@') ? `Press Invite to send an invitation to ${q}` : 'No matching members — enter an email to invite someone new'}
            </div>
          )}
        </div>
      )}
      <div>
        <div className={cn(eyebrow, 'mb-1')}>People with access</div>
        {p.members.map(mid => {
          const x = memberById(d, mid);
          if (!x) return null;
          const lead = mid === p.lead;
          const cur = lead ? 'Full access' : (p.perms?.[mid] ?? (x.role === 'Guest' ? 'Can comment' : 'Can edit'));
          return (
            <div key={mid} className="flex h-11 items-center gap-2.5">
              <Avatar id={mid} size="md" tip={false} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium">
                  {x.name}
                  {mid === d.me && <span className="font-normal text-muted-foreground"> (you)</span>}
                </div>
                <div className="truncate text-2xs text-muted-foreground">{`${x.email}${lead ? ' · Project lead' : ''}`}</div>
              </div>
              {lead ? (
                <span className="pr-2 text-sm text-fg-2">Full access</span>
              ) : (
                <Select items={MEMBER_PERM_ITEMS} value={cur} onValueChange={v => v && setPerm(p.id, mid, v)}>
                  <SelectTrigger
                    size="sm"
                    className="border-transparent bg-transparent text-xs shadow-none hover:bg-muted"
                    aria-label={`Permission for ${x.name}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end" alignItemWithTrigger={false}>
                    {PERM_ITEMS.map(o => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                    <SelectSeparator />
                    <SelectItem value={REMOVE} className="text-destructive">
                      Remove access
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          );
        })}
      </div>
      <div className="border-t border-divider pt-3">
        <div className={cn(eyebrow, 'mb-2')}>General access</div>
        <div className="flex items-center gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted text-fg-2">
            {access === 'private' ? <Lock className="size-3.5" /> : <Building2 className="size-3.5" />}
          </span>
          <div className="min-w-0 flex-1">
            <Select
              items={ACCESS_ITEMS(d.ws.name)}
              value={access}
              onValueChange={v =>
                (v === 'private' || v === 'workspace') &&
                mutate(s => {
                  const x = projectById(s.data, p.id);
                  if (x) x.access = v;
                })
              }
            >
              <SelectTrigger
                size="sm"
                className="-ml-1 border-transparent bg-transparent pl-1 font-medium shadow-none hover:bg-muted"
                aria-label="General access"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                {ACCESS_ITEMS(d.ws.name).map(o => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-2xs text-muted-foreground">
              {access === 'private' ? 'Only people listed above can open this project.' : 'Anyone in the workspace can view and comment.'}
            </div>
          </div>
        </div>
      </div>
    </ModalFrame>
  );
}

function ModalBody({ m }: { m: Exclude<Modal, { type: 'confirm' }> }) {
  switch (m.type) {
    case 'task':
      return <TaskModal edit={m.edit} />;
    case 'project':
      return <ProjectModal edit={m.edit} />;
    case 'team':
      return (
        <DialogContent className={cn('overflow-y-auto', modalPlace('md'))}>
          <TeamModal edit={m.edit} />
        </DialogContent>
      );
    case 'share':
      return <ShareModal id={m.id} />;
    case 'invite':
      return <InviteModal />;
    case 'shortcuts':
      return <ShortcutsModal />;
    case 'saveView':
      return <SaveViewModal m={m} />;
    case 'filePreview':
      return <FilePreviewModal m={m} />;
    case 'prompt':
      return <PromptModal m={m} />;
  }
}

export function ModalsLayer() {
  const modals = useStore(s => s.ui.modals);
  return modals.map((m, i) =>
    m.type === 'confirm' ? (
      <AlertDialog key={m.id} open onOpenChange={open => !open && closeModal()}>
        <ConfirmModal m={m} />
      </AlertDialog>
    ) : (
      <Dialog key={`${i}:${m.type}`} open onOpenChange={open => !open && closeModal()}>
        <ModalBody m={m} />
      </Dialog>
    ),
  );
}
