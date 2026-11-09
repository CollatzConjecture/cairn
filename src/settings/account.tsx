/* Settings sections with forms and account state. */
import { useState } from 'react';
import { Check, CircleCheck, CreditCard, Monitor, ShieldAlert, ShieldCheck, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { AVATAR_COLORS, PLANS, WS_COLORS, type Plan as PlanName } from '../domain/constants';
import { dOff, fmtDate } from '../domain/date';
import { seed } from '../domain/seed';
import { linkTo } from '../shell/shell';
import { confirm, get, go, me, mutate, set, toast, useStore } from '../store';
import { Avatar, Tag } from '../ui/helpers';
import { WsLogo } from '../ui/brand';
import { Callout, Panel, Swatches, Eyebrow, tc } from '../pages/kit';
import { FormField, SBlock, SRow, field, invalid, useBusy } from './parts';
import { StrengthMeter } from './strength';

const swatches = (colors: Record<string, string>) => Object.entries(colors).map(([label, c]) => ({ value: c, c, label }));
const WS_SWATCHES = swatches(WS_COLORS);
const AVATAR_SWATCHES = swatches(AVATAR_COLORS);
/** True when a new password is too weak: under 10 characters, or no number or symbol. */
export const weakPw = (pw: string) => pw.length < 10 || !/[0-9\W]/.test(pw);
const PW_RULE = 'Use at least 10 characters, including a number or symbol';

const SaveButton = ({ busy, children }: { busy: boolean; children: string }) => (
  <Button type="submit" disabled={busy} className="self-start">
    {busy && <Spinner />}
    {children}
  </Button>
);

/* ---------- Workspace ---------- */
async function delWorkspace() {
  const name = get().data.ws.name;
  const ok = await confirm({
    title: `Delete ${name}?`,
    body: 'Every project, task, file, and comment in this workspace will be permanently deleted for all members.',
    ok: 'Delete workspace',
    danger: true,
    typeName: name,
  });
  if (!ok) return;
  set(s => {
    s.data = seed();
    s.views = {};
  });
  go({ r: 'login' });
  toast('Workspace deleted. Demo data was restored for this prototype.', { kind: 'info', ms: 5000 });
}
export function Workspace() {
  const ws = useStore(s => s.data.ws);
  const [busy, run] = useBusy();
  return (
    <>
      <form
        noValidate
        onSubmit={e => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const n = field(f, 'name').trim();
          const u = field(f, 'url')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, '-');
          if (!n) return void toast("Workspace name can't be empty", { kind: 'err' });
          run(600, () => {
            const ok = mutate(s => {
              const old = s.data.ws.name;
              s.data.ws.name = n;
              s.data.ws.url = u || s.data.ws.url;
              const w = s.data.workspaces.find(x => x.name === old);
              if (w) w.name = n;
            });
            if (ok) toast('Workspace settings saved');
          });
        }}
      >
        <div className="mb-4.5 flex items-center gap-3.5">
          <WsLogo w={ws} px={52} />
          <div>
            <div className="mb-1.5 text-sm font-medium text-foreground">Workspace icon</div>
            <Swatches
              label="Workspace color"
              value={ws.c}
              options={WS_SWATCHES}
              onChange={c =>
                set(s => {
                  s.data.ws.c = c;
                })
              }
            />
          </div>
        </div>
        <div className="flex max-w-110 flex-col gap-3.5">
          <FormField id="ws-name" label="Workspace name">
            <Input id="ws-name" name="name" defaultValue={ws.name} />
          </FormField>
          <FormField id="ws-url" label="Workspace URL" hint="Changing the URL will break existing links.">
            <InputGroup className="h-7.5 rounded-md">
              <InputGroupAddon className="h-full rounded-l-md border-r bg-muted pr-2 text-base font-normal text-fg-2">{location.host}/</InputGroupAddon>
              <InputGroupInput id="ws-url" name="url" defaultValue={ws.url} />
            </InputGroup>
          </FormField>
          <SaveButton busy={busy}>Save changes</SaveButton>
        </div>
      </form>
      <SBlock title="Danger zone" danger>
        <SRow title="Delete workspace" desc="Permanently delete this workspace, its projects, tasks, and files. This cannot be undone.">
          <Button variant="outline" className="border-red/35 text-red hover:bg-red/10 hover:text-red" onClick={() => void delWorkspace()}>
            Delete workspace
          </Button>
        </SRow>
      </SBlock>
    </>
  );
}

/* ---------- Profile ---------- */
export function Profile() {
  const d = useStore(s => s.data);
  const p = useStore(s => s.prefs);
  const err = useStore(s => s.ui.errors.pname2);
  const [busy, run] = useBusy();
  const self = me(d);
  return (
    <form
      noValidate
      className="flex max-w-110 flex-col gap-4"
      onSubmit={e => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const n = field(f, 'name').trim();
        const tt = field(f, 'title').trim();
        set(s => {
          s.ui.errors.pname2 = n ? null : 'Enter your name';
        });
        if (!n) return;
        run(600, () => {
          const ok = mutate(s => {
            s.prefs.name = n;
            s.prefs.title = tt;
            const m = me(s.data);
            if (m) Object.assign(m, { name: n, title: tt });
          });
          if (ok) toast('Profile updated');
        });
      }}
    >
      <div className="flex items-center gap-3.5">
        <Avatar id={d.me} size="xl" tip={false} />
        <div>
          <div className="mb-1.5 text-sm font-medium text-foreground">Avatar color</div>
          <Swatches
            label="Avatar color"
            value={self?.c ?? ''}
            options={AVATAR_SWATCHES}
            onChange={c =>
              set(s => {
                const m = me(s.data);
                if (m) m.c = c;
              })
            }
          />
        </div>
      </div>
      <FormField id="pf-name" label="Full name" error={err}>
        <Input {...invalid('pf-name', err)} name="name" defaultValue={p.name} />
      </FormField>
      <FormField id="pf-title" label="Title">
        <Input id="pf-title" name="title" defaultValue={p.title} />
      </FormField>
      <FormField id="pf-email" label="Email" hint="Contact a workspace owner to change your sign-in email.">
        <Input id="pf-email" defaultValue={self?.email} disabled />
      </FormField>
      <SaveButton busy={busy}>Save profile</SaveButton>
    </form>
  );
}

/* ---------- Password ---------- */
type PwErrors = Partial<Record<'cur' | 'nw' | 'conf', string>>;
export function Password() {
  const [pw, setPw] = useState('');
  const [errs, setErrs] = useState<PwErrors>({});
  const [done, setDone] = useState(false);
  const [busy, run] = useBusy();
  return (
    <>
      {done && (
        <Callout tone="ok" icon={CircleCheck} className="mb-3.5">
          Password updated. Other sessions stay signed in.
        </Callout>
      )}
      <form
        noValidate
        className="flex max-w-100 flex-col gap-3.5"
        onSubmit={e => {
          e.preventDefault();
          const form = e.currentTarget;
          const f = new FormData(form);
          const cur = field(f, 'cur'),
            nw = field(f, 'new'),
            cf = field(f, 'conf');
          const next: PwErrors = {};
          if (!cur) next.cur = 'Enter your current password';
          if (weakPw(nw)) next.nw = PW_RULE;
          if (nw !== cf) next.conf = "Passwords don't match";
          setErrs(next);
          setDone(false);
          if (Object.keys(next).length) return;
          run(800, () => {
            setDone(true);
            setPw('');
            form.reset();
            toast('Password updated');
          });
        }}
      >
        <FormField id="pw-cur" label="Current password" error={errs.cur}>
          <Input {...invalid('pw-cur', errs.cur)} name="cur" type="password" autoComplete="current-password" />
        </FormField>
        <FormField id="pw-new" label="New password" error={errs.nw} hint="At least 10 characters with a number or symbol.">
          <Input
            {...invalid('pw-new', errs.nw)}
            name="new"
            type="password"
            autoComplete="new-password"
            value={pw}
            onChange={e => setPw(e.currentTarget.value)}
          />
          <StrengthMeter pw={pw} />
        </FormField>
        <FormField id="pw-conf" label="Confirm new password" error={errs.conf}>
          <Input {...invalid('pw-conf', errs.conf)} name="conf" type="password" autoComplete="new-password" />
        </FormField>
        <SaveButton busy={busy}>Update password</SaveButton>
      </form>
    </>
  );
}

/* ---------- Sessions, 2FA ---------- */
async function revokeAll() {
  const ok = await confirm({
    title: 'Sign out of all other sessions?',
    body: "You'll stay signed in on this device. Other devices will need to sign in again.",
    ok: 'Sign out others',
    danger: true,
    icon: 'log-out',
  });
  if (ok && mutate(s => void (s.data.sessions = s.data.sessions.filter(x => x.cur)))) toast('Signed out of other sessions');
}
export function Sessions() {
  const ss = useStore(s => s.data.sessions);
  return (
    <>
      {ss.map(x => {
        const I = x.dev.includes('iPhone') ? Smartphone : Monitor;
        return (
          <SRow
            key={x.id}
            title={
              <span className="flex items-center gap-2">
                <I className="size-3.75" />
                {x.dev}
                {x.cur && <Tag tone="green">This device</Tag>}
              </span>
            }
            desc={`${x.loc} · ${x.at}`}
          >
            {!x.cur && (
              <Button
                variant="outline"
                size="sm"
                aria-label={`Sign out ${x.dev}`}
                onClick={() => {
                  if (mutate(s => void (s.data.sessions = s.data.sessions.filter(y => y.id !== x.id)))) toast('Session signed out');
                }}
              >
                Sign out
              </Button>
            )}
          </SRow>
        );
      })}
      <Button variant="ghost" className="mt-4 text-red hover:bg-red/10 hover:text-red" disabled={ss.length < 2} onClick={() => void revokeAll()}>
        Sign out of all other sessions
      </Button>
    </>
  );
}

const QR = Array.from({ length: 121 }, (_, i) => {
  const r = Math.floor(i / 11),
    c = i % 11;
  const finder = (r < 3 && c < 3) || (r < 3 && c > 7) || (r > 7 && c < 3);
  return finder ? !((r === 1 && c === 1) || (r === 1 && c === 9) || (r === 9 && c === 1)) : (i * 7919) % 13 < 6;
});
async function disable2fa() {
  const ok = await confirm({
    title: 'Turn off two-factor authentication?',
    body: 'Your account will be protected by your password only.',
    ok: 'Turn off',
    danger: true,
    icon: 'shield-off',
  });
  if (ok && mutate(s => void (s.data.tfa = false))) toast('Two-factor authentication turned off');
}
export function TwoFactor() {
  const on = useStore(s => s.data.tfa);
  const [setup, setSetup] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (on)
    return (
      <>
        <Callout tone="ok" icon={ShieldCheck}>
          <b className="font-semibold">Two-factor authentication is on.</b>
          <div className="text-fg-2">You&apos;ll enter a code from your authenticator app when signing in on a new device.</div>
        </Callout>
        <SBlock title="Recovery codes">
          <p className="text-sm text-fg-2">Store these somewhere safe. Each code works once.</p>
          <div className="mt-2 grid w-fit grid-cols-[repeat(2,max-content)] gap-x-7 gap-y-1.5 rounded-lg border bg-sunken p-3.5 font-mono text-base select-all">
            {['7KQ2-M8PX', 'D4TN-9WRE', 'HV3C-QZ6L', 'P2YB-J7SK', 'R9FG-4NUD', 'X6MA-T3HE'].map(c => (
              <span key={c}>{c}</span>
            ))}
          </div>
          <Button variant="ghost" className="mt-3.5 text-red hover:bg-red/10 hover:text-red" onClick={() => void disable2fa()}>
            Turn off two-factor authentication
          </Button>
        </SBlock>
      </>
    );
  if (setup)
    return (
      <Panel className="flex flex-wrap gap-5 p-4.5">
        <div className="grid size-33 grid-cols-11 gap-px rounded-lg border bg-white p-2" role="img" aria-label="QR code">
          {QR.map((x, i) => (
            <i key={i} className={x ? 'bg-black/90' : 'bg-white'} />
          ))}
        </div>
        <div className="flex min-w-55 flex-1 flex-col gap-2.5">
          <div>
            <b className="font-semibold">1. Scan the QR code</b>
            <div className="text-sm text-fg-2">Use 1Password, Authy, or Google Authenticator.</div>
          </div>
          <b className="font-semibold">2. Enter the 6-digit code</b>
          <form
            noValidate
            className="flex flex-wrap items-center gap-2"
            onSubmit={e => {
              e.preventDefault();
              const v = field(new FormData(e.currentTarget), 'code').trim();
              if (!/^\d{6}$/.test(v)) return setErr('Enter the 6-digit code from your app');
              setErr(null);
              if (
                mutate(s => {
                  s.data.tfa = true;
                })
              ) {
                setSetup(false);
                toast('Two-factor authentication enabled');
              }
            }}
          >
            <Input
              {...invalid('tfa-code', err)}
              name="code"
              aria-label="6-digit code"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              autoFocus
              className="w-32.5 font-mono text-[15px] tracking-[0.2em]"
            />
            <Button type="submit">Verify</Button>
            <Button type="button" variant="ghost" onClick={() => setSetup(false)}>
              Cancel
            </Button>
          </form>
          {err ? (
            <span id="tfa-code-err" className="text-xs text-destructive">
              {err}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Any 6 digits work in this prototype.</span>
          )}
        </div>
      </Panel>
    );
  return (
    <Panel className="p-4.5">
      <div className="flex items-start gap-3.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber/14 text-amber">
          <ShieldAlert className="size-4.5" />
        </span>
        <div className="flex-1">
          <b className="font-semibold">Two-factor authentication is off</b>
          <p className="mt-1 mb-3 text-sm text-fg-2">Protect your account with a code from an authenticator app in addition to your password.</p>
          <Button
            onClick={() => {
              setErr(null);
              setSetup(true);
            }}
          >
            Set up two-factor authentication
          </Button>
        </div>
      </div>
    </Panel>
  );
}

/* ---------- Billing ---------- */
const PRICE: Record<PlanName, number> = { Free: 0, Team: 12, Business: 24 };
const FEATURES: Record<PlanName, string[]> = {
  Free: ['Up to 3 members', 'Unlimited tasks', '5 GB storage'],
  Team: ['Up to 50 members', 'Timelines & custom views', '100 GB storage', 'Guest access'],
  Business: ['Unlimited members', 'Advanced permissions', 'SAML SSO', '1 TB storage'],
};
async function changePlan(v: PlanName) {
  const n = get().data.members.length;
  const ok = await confirm({
    title: `${v === 'Free' ? 'Downgrade' : 'Upgrade'} to ${v}?`,
    body: [`${n} members × $${PRICE[v]}/month = `, { b: `$${n * PRICE[v]}/month` }, ', prorated from today and billed to Visa ending 4242.'],
    ok: v === 'Free' ? 'Downgrade' : `Upgrade to ${v}`,
    icon: 'gem',
  });
  if (ok && mutate(s => void (s.data.plan = v))) toast(`You're now on the ${v} plan`);
}
export function Plan() {
  const d = useStore(s => s.data);
  const cur = d.plan ?? 'Team';
  const usage: [string, number, number, string][] = [
    ['Members', d.members.length, 10, ''],
    ['Storage', 12.4, 100, ' GB'],
    ['Projects', d.projects.length, 50, ''],
  ];
  return (
    <>
      <Panel className="mb-4.5 p-4.5">
        <div className="flex flex-wrap items-start gap-3">
          <div>
            <Eyebrow>Current plan</Eyebrow>
            <div className="mt-1 text-[20px] font-semibold tracking-[-0.015em]">
              {cur} <span className="text-md font-normal text-fg-2">· $12 per member / month</span>
            </div>
            <div className="text-sm text-fg-2">{`Renews ${fmtDate(dOff(7), true)} · Billed monthly`}</div>
          </div>
          <Button variant="outline" className="ml-auto" nativeButton={false} render={<a {...linkTo({ r: 'settings', sec: 'invoices' })} />}>
            View invoices
          </Button>
        </div>
        <div className="mt-4.5 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4.5">
          {usage.map(([n, v, m, u]) => (
            <div key={n}>
              <div className="mb-1.5 flex text-sm">
                <span className="text-fg-2">{n}</span>
                <span className="ml-auto tabular-nums">{`${v}${u} of ${m}${u}`}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted-strong">
                <i className={cn('block h-full rounded-full bg-primary', v / m > 0.75 && 'bg-amber')} style={{ width: `${(v / m) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        {PLANS.map(n => {
          const on = cur === n;
          return (
            <section
              key={n}
              aria-label={`${n} plan`}
              className={cn('flex flex-col gap-2 rounded-xl border p-4', on && 'border-primary ring-3 ring-primary-soft')}
            >
              <div className="flex items-center gap-2">
                <b className="font-semibold">{n}</b>
                {on && <Tag tone="primary">Current</Tag>}
              </div>
              <div className="text-[22px] font-semibold tracking-[-0.02em]">
                {`$${PRICE[n]}`}
                <span className="text-sm font-normal text-fg-2"> /member/mo</span>
              </div>
              <ul className="flex flex-col gap-1.5 text-base">
                {FEATURES[n].map(x => (
                  <li key={x} className="flex items-center gap-2">
                    <Check className="size-3.25 text-green" />
                    {x}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-2">
                {on ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current plan
                  </Button>
                ) : (
                  <Button variant={n === 'Business' ? 'default' : 'outline'} className="w-full" onClick={() => void changePlan(n)}>
                    {n === 'Free' ? 'Downgrade' : 'Upgrade'}
                  </Button>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
export function Payment() {
  return (
    <>
      <SRow
        title={
          <span className="flex items-center gap-2.5">
            <span className="grid size-6.5 place-items-center rounded-md bg-blue/14 text-blue">
              <CreditCard className="size-3.75" />
            </span>
            Visa ending in 4242
          </span>
        }
        desc="Expires 08/2028 · Default"
      >
        <Button variant="outline" size="sm" onClick={() => toast('Card updates open in a secure payment window', { kind: 'info' })}>
          Update
        </Button>
      </SRow>
      <SRow title="Billing email" desc="Invoices and receipts are sent here.">
        <span className="text-fg-2 select-all">hello@example.com</span>
      </SRow>
      <SRow title="Billing address" desc="2150 Mission St, San Francisco, CA 94110">
        <Button variant="outline" size="sm" onClick={() => toast('Address editing opens in the billing portal', { kind: 'info' })}>
          Edit
        </Button>
      </SRow>
      <SRow title="Tax ID" desc="Shown on invoices">
        <span className="text-fg-2">US EIN ••-•••4410</span>
      </SRow>
    </>
  );
}
export function Invoices() {
  const inv = useStore(s => s.data.invoices);
  return (
    <Panel>
      <Table className={cn(tc.table, 'min-w-120')}>
        <TableHeader>
          <TableRow className={tc.row}>
            {['Invoice', 'Date', 'Amount', 'Status'].map(h => (
              <TableHead key={h} className={tc.head}>
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {inv.map(i => (
            <TableRow key={i.id} className={cn(tc.row, 'last:border-b-0')}>
              <TableCell className={cn(tc.cell, 'font-mono')}>{i.id}</TableCell>
              <TableCell className={cn(tc.cell, 'tabular-nums')}>{fmtDate(i.date, true)}</TableCell>
              <TableCell className={cn(tc.cell, 'tabular-nums')}>{i.amt}</TableCell>
              <TableCell className={tc.cell}>
                <Tag tone="green">
                  <Check />
                  {i.st}
                </Tag>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Panel>
  );
}
