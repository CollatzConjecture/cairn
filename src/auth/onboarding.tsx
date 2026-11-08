/* Onboarding: six steps, one route each. Choices live in `ui.onbData`, so
   moving back and forth keeps them; finishing creates the workspace, the first project and the invites. */
import type { ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BuildingComplex,
  ChartGantt,
  Check,
  CircleCheck,
  Code,
  Link,
  ListChecks,
  Megaphone,
  Palette,
  Sparkles,
  SquareKanban,
  Table2,
  Target,
  User,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { cn } from '@/lib/utils';
import { PCOLORS, TEMPLATES, WS_COLORS, type TemplateId } from '../domain/constants';
import { memberId, uid, workspaceId, type ProjectId } from '../domain/ids';
import { copyInviteLink, createProject, get, go, me, mutate, set, toast, useStore, type OnbData } from '../store';
import { Icon } from '../ui/icon';
import { Panel, Seg } from '../pages/kit';
import { FormField, invalid } from '../settings/parts';
import { AuthShell, EMAIL_RE, lg } from './auth-shell';

const N = 6;
const TEAM_VIEW = { kanban: 'board', list: 'list', timeline: 'timeline', table: 'table' } as const;
const TEAM_NAME = { kanban: 'Board', list: 'List', timeline: 'Timeline', table: 'Table' } as const;
const STARTERS = TEMPLATES.filter(t => t.id !== 'blank');

const setOnb = (fn: (o: OnbData) => void) => set(s => fn(s.ui.onbData));
const invites = (o: OnbData) => o.invites.split(',');
const toStep = (step: number) => go({ r: 'onboarding', step });
const exit = () => go({ r: get().prefs.home });

/** Validate the step, then move on. `skip` clears the invites on the invite step. */
function next(step: number, skip = false) {
  const o = get().ui.onbData;
  if (step === 1 && !o.ws.trim()) {
    set(s => {
      s.ui.errors.ws = 'Name your workspace to continue';
    });
    return;
  }
  if (step === 3 && !o.proj.trim()) return void toast('Give your project a name', { kind: 'err' });
  if (step === 4) {
    if (skip) setOnb(x => void (x.invites = ''));
    else {
      const bad = invites(o).filter(x => x && !EMAIL_RE.test(x));
      if (bad.length) return void toast(`${bad[0]} isn't a valid email address`, { kind: 'err' });
    }
  }
  toStep(step + 1);
}
function finish() {
  const o = get().ui.onbData;
  const tm = TEMPLATES.find(t => t.id === o.tmpl) ?? TEMPLATES[2];
  let pid: ProjectId | null = null;
  const tab = TEAM_VIEW[o.team];
  mutate(s => {
    const d = s.data;
    if (o.ws.trim()) {
      const c = [WS_COLORS.graphite, WS_COLORS.indigo, WS_COLORS.teal, WS_COLORS.rose][d.workspaces.length % 4] ?? WS_COLORS.graphite;
      d.ws = { name: o.ws.trim(), url: o.url || 'workspace', c };
      if (!d.workspaces.some(w => w.name === d.ws.name)) d.workspaces.push({ id: workspaceId(uid('w')), name: d.ws.name, c, plan: 'Free' });
    }
    s.prefs.defaultTab = tab;
    const team = me(d)?.team ?? null;
    pid = createProject(
      s,
      { name: o.proj.trim() || tm.name, icon: tm.icon, color: 'indigo', team, lead: d.me, desc: `Created during setup from the ${tm.name} template.` },
      tm.id,
    ).id;
    invites(o)
      .filter(x => EMAIL_RE.test(x))
      .forEach(email =>
        d.members.push({
          id: memberId(uid('m')),
          name: (email.split('@')[0] ?? email).replace(/\b\w/g, c => c.toUpperCase()),
          email,
          role: 'Member',
          team,
          title: 'Member',
          c: PCOLORS.slate,
          status: 'invited',
          last: null,
          tz: '—',
        }),
      );
  });
  if (pid) go({ r: 'project', id: pid, tab });
  toast(`Welcome to ${get().data.ws.name}`);
}

type Opt = { value: string; icon: ReactNode; name: string; sub?: string };
function Options({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Opt[];
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-3 gap-2 max-sm:grid-cols-2', className)} role="radiogroup" aria-label={label}>
      {options.map(o => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={on}
            className={cn(
              'flex flex-col gap-2 rounded-xl border bg-card px-3 py-3.5 text-left transition-[border-color,box-shadow,transform] hover:border-input active:scale-[0.98]',
              on && 'border-primary ring-3 ring-primary-soft hover:border-primary',
            )}
            onClick={() => onChange(o.value)}
          >
            <span className={cn('text-fg-2 [&_svg]:size-4.5', on && 'text-primary')}>{o.icon}</span>
            <b className="font-medium">{o.name}</b>
            {o.sub && <span className="text-xs text-muted-foreground">{o.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}

function Nav({ step, label = 'Continue', skip = false }: { step: number; label?: string; skip?: boolean }) {
  return (
    <div className="mt-1.5 flex items-center gap-2">
      {step > 0 && step < 5 && (
        <Button variant="ghost" onClick={() => toStep(step - 1)}>
          <ArrowLeft />
          Back
        </Button>
      )}
      <span className="flex-1" />
      {skip && (
        <Button variant="ghost" onClick={() => next(step, true)}>
          Skip for now
        </Button>
      )}
      <Button size="lg" onClick={() => next(step)}>
        {label}
        <ArrowRight className="size-3.75" />
      </Button>
    </div>
  );
}
const Head = ({ title, sub }: { title: string; sub: string }) => (
  <>
    <h1 className="text-center text-2xl font-semibold tracking-[-0.022em]">{title}</h1>
    <p className="-mt-2 mb-1 text-center text-fg-2">{sub}</p>
  </>
);

function Step({ step, o }: { step: number; o: OnbData }) {
  const wsErr = useStore(s => s.ui.errors.ws);
  if (step === 0)
    return (
      <>
        <Head title="What are you working on?" sub="We'll tailor templates and views to fit. You can change this later." />
        <Options
          label="What are you working on?"
          value={o.use}
          onChange={v => setOnb(x => void (x.use = v))}
          options={[
            { value: 'product', icon: <Target />, name: 'Product', sub: 'Roadmaps & launches' },
            { value: 'design', icon: <Palette />, name: 'Design', sub: 'Reviews & handoff' },
            { value: 'marketing', icon: <Megaphone />, name: 'Marketing', sub: 'Campaigns & content' },
            { value: 'engineering', icon: <Code />, name: 'Engineering', sub: 'Sprints & releases' },
            { value: 'personal', icon: <User />, name: 'Personal', sub: 'Goals & side projects' },
            { value: 'other', icon: <Sparkles />, name: 'Other', sub: 'Something else' },
          ]}
        />
        <Nav step={0} />
      </>
    );
  if (step === 1)
    return (
      <>
        <Head title="Create your workspace" sub="A workspace is where your team's projects live." />
        <FormField id="o-ws" label="Workspace name" error={wsErr}>
          <Input
            {...invalid('o-ws', wsErr)}
            className={lg}
            autoFocus
            placeholder="e.g. Cairn"
            value={o.ws}
            onChange={e => {
              const v = e.currentTarget.value;
              set(s => {
                const x = s.ui.onbData;
                x.ws = v;
                if (!x.urlTouched)
                  x.url = v
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '');
                if (v.trim()) s.ui.errors.ws = null;
              });
            }}
            onKeyDown={e => e.key === 'Enter' && next(1)}
          />
        </FormField>
        <FormField
          id="o-url"
          label="Workspace URL"
          hint={
            o.url && (
              <span className="flex items-center gap-1 text-green">
                <Check className="size-3" />
                {`${location.host}/${o.url} is available`}
              </span>
            )
          }
        >
          <InputGroup className="h-9 rounded-md">
            <InputGroupAddon className="h-full rounded-l-md border-r bg-muted pr-2 text-base font-normal text-fg-2">{location.host}/</InputGroupAddon>
            <InputGroupInput
              id="o-url"
              className="text-base"
              placeholder="cairn"
              value={o.url}
              onChange={e => {
                const v = e.currentTarget.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
                setOnb(x => {
                  x.url = v;
                  x.urlTouched = true;
                });
              }}
            />
          </InputGroup>
        </FormField>
        <Nav step={1} />
      </>
    );
  if (step === 2)
    return (
      <>
        <Head title="How does your team work?" sub="We'll set your default project view." />
        <Options
          label="How does your team work?"
          className="grid-cols-2"
          value={o.team}
          onChange={v => {
            const t = (['kanban', 'list', 'timeline', 'table'] as const).find(x => x === v);
            if (t) setOnb(x => void (x.team = t));
          }}
          options={[
            { value: 'kanban', icon: <SquareKanban />, name: 'Boards', sub: 'Move cards through stages' },
            { value: 'list', icon: <ListChecks />, name: 'Lists', sub: 'Checklists and priorities' },
            { value: 'timeline', icon: <ChartGantt />, name: 'Timelines', sub: 'Plan with dates & dependencies' },
            { value: 'table', icon: <Table2 />, name: 'Tables', sub: 'Spreadsheet-style tracking' },
          ]}
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Team size</span>
          <Seg
            label="Team size"
            value={o.size}
            onChange={v => setOnb(x => void (x.size = v))}
            items={['Just me', '2-10', '11-50', '51-200', '200+'].map(v => ({ value: v, label: v }))}
          />
        </div>
        <Nav step={2} />
      </>
    );
  if (step === 3)
    return (
      <>
        <Head title="Create your first project" sub="Start from a template or a blank project." />
        <FormField id="o-proj" label="Project name">
          <Input
            id="o-proj"
            className={lg}
            autoFocus
            value={o.proj}
            onChange={e => {
              const v = e.currentTarget.value;
              setOnb(x => {
                x.proj = v;
                x.projTouched = true;
              });
            }}
          />
        </FormField>
        <Options
          label="Template"
          value={o.tmpl}
          onChange={v => {
            const t = STARTERS.find(x => x.id === v);
            if (t)
              setOnb(x => {
                x.tmpl = t.id satisfies TemplateId;
                if (!x.projTouched) x.proj = t.name === 'Website' ? 'Website Launch' : t.name;
              });
          }}
          options={STARTERS.map(t => ({ value: t.id, icon: <Icon name={t.icon} />, name: t.name, sub: `${t.tasks.length} starter tasks` }))}
        />
        <Nav step={3} />
      </>
    );
  if (step === 4)
    return (
      <>
        <Head title="Invite your team" sub="Cairn works best with your teammates. They'll get an email invite." />
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map(i => (
            <Input
              key={i}
              className={lg}
              type="email"
              placeholder="teammate@company.com"
              aria-label={`Teammate email ${i + 1}`}
              value={invites(o)[i] ?? ''}
              onChange={e => {
                const v = e.currentTarget.value.trim();
                setOnb(x => {
                  const a = invites(x);
                  a[i] = v;
                  x.invites = Array.from(a, s => s ?? '').join(',');
                });
              }}
            />
          ))}
        </div>
        <Button variant="ghost" size="sm" className="self-start" onClick={() => void copyInviteLink()}>
          <Link />
          Copy invite link instead
        </Button>
        <Nav step={4} label="Send invites" skip />
      </>
    );
  const tm = TEMPLATES.find(t => t.id === o.tmpl);
  const n = invites(o).filter(x => x.includes('@')).length;
  const rows: [ReactNode, string, string][] = [
    [<BuildingComplex key="w" />, `Workspace “${o.ws || 'My Workspace'}”`, `${location.host}/${o.url || 'workspace'}`],
    [<Icon key="p" name={tm?.icon ?? 'folder'} />, `Project “${o.proj}”`, `${tm?.tasks.length ?? 0} starter tasks · ${TEAM_NAME[o.team]} view`],
    [
      <UserPlus key="i" />,
      n ? `${n} invite${n > 1 ? 's' : ''} sent` : 'No invites yet',
      n ? "They'll appear in Members once they join" : 'Invite people any time from the sidebar',
    ],
  ];
  return (
    <>
      <div className="flex justify-center">
        <span className="grid size-12 place-items-center rounded-xl bg-green/14 text-green animate-in zoom-in-95 fade-in duration-250">
          <CircleCheck className="size-5.5" />
        </span>
      </div>
      <Head title="Your workspace is ready" sub="Here's what we set up for you." />
      <Panel>
        {rows.map(([icon, t, s], i) => (
          <div key={i} className="flex items-center gap-3 border-t border-divider px-3.5 py-3 first:border-t-0">
            <span className="grid size-6.5 shrink-0 place-items-center rounded-md bg-primary-soft text-primary [&_svg]:size-3.5">{icon}</span>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{t}</div>
              <div className="text-xs text-muted-foreground">{s}</div>
            </div>
            <Check className="size-3.75 text-green" />
          </div>
        ))}
      </Panel>
      <Button size="lg" className="w-full" onClick={finish}>
        Open workspace
        <ArrowRight className="size-3.75" />
      </Button>
    </>
  );
}

export function OnboardingPage({ step }: { step: number }) {
  const o = useStore(s => s.ui.onbData);
  return (
    <AuthShell
      action={
        <Button variant="ghost" size="sm" onClick={exit}>
          Exit setup
        </Button>
      }
    >
      <div
        key={step}
        className={cn('flex w-full flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-250', step === 5 ? 'max-w-110' : 'max-w-140')}
      >
        <div
          className="mb-2 flex justify-center gap-1.5"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={N}
          aria-valuenow={step + 1}
          aria-label={`Step ${step + 1} of ${N}`}
        >
          {Array.from({ length: N }, (_, i) => (
            <i key={i} className={cn('h-0.75 w-7 rounded-full bg-input transition-colors duration-200', i <= step && 'bg-primary')} />
          ))}
        </div>
        <div className="text-center text-xs text-muted-foreground">{`Step ${step + 1} of ${N}`}</div>
        <Step step={step} o={o} />
      </div>
    </AuthShell>
  );
}
