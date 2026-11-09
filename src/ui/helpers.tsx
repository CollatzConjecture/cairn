/* Small render helpers shared across the app, on shadcn primitives and theme tokens. */
import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { FolderArchive, User } from 'lucide-react';
import { Avatar as AvatarRoot } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Empty as EmptyRoot, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { FT, LB, PR, PSTAT, ST, type LabelId, type Priority, type ProjectStatus, type Status } from '../domain/constants';
import { TODAY, diffD, parse, relDate } from '../domain/date';
import type { MemberId } from '../domain/ids';
import type { Attachment, Project, Task } from '../domain/schema';
import { memberById, pColor } from '../store/selectors';
import { useStore } from '../store/store';
import { Icon } from './icon';

/** A hover tooltip on any element. `side` defaults to top. */
export function Tip({ label, side, children }: { label: ReactNode; side?: 'top' | 'right' | 'bottom' | 'left'; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}

const AV_SIZE = {
  sm: 'size-5 text-[8px]',
  default: 'size-5.5 text-[8.8px]',
  md: 'size-6.5 text-[10.4px]',
  lg: 'size-9 text-[14.4px]',
  xl: 'size-16 text-[25.6px]',
} as const;
export type AvatarSize = keyof typeof AV_SIZE;

/** Initials on the member colour, a dashed ring when unassigned. `presence` adds the online dot. */
export function Avatar({
  id,
  size = 'default',
  tip = true,
  presence = false,
  className,
}: {
  id: MemberId | null | undefined;
  size?: AvatarSize;
  tip?: boolean;
  presence?: boolean;
  className?: string;
}) {
  const m = useStore(s => memberById(s.data, id));
  const ini = m
    ? m.name
        .split(' ')
        .map(x => x[0])
        .join('')
        .slice(0, 2)
    : '';
  const av = (
    <AvatarRoot
      className={cn(
        'grid place-items-center overflow-visible leading-none font-semibold tracking-[0.01em] ring-[1.5px] ring-background after:hidden',
        AV_SIZE[size],
        m ? 'avatar-tint' : 'border-[1.3px] border-dashed border-input text-fg-4 ring-0 [&_svg]:size-[50%]',
        presence &&
          'before:absolute before:-right-px before:-bottom-px before:z-10 before:size-[30%] before:rounded-full before:bg-green before:ring-2 before:ring-background',
        className,
      )}
      style={m ? { '--c': m.c } : undefined}
      aria-label={m?.name ?? 'Unassigned'}
    >
      {m ? ini : <User />}
    </AvatarRoot>
  );
  return tip ? <Tip label={m?.name ?? 'Unassigned'}>{av}</Tip> : av;
}

/** Overlapping avatars with a +N count past `max`. */
export function AvatarStack({ ids, max = 4, size = 'sm' }: { ids: readonly MemberId[]; max?: number; size?: AvatarSize }) {
  return (
    <span className="inline-flex *:not-first:-ml-1.25">
      {ids.slice(0, max).map(i => (
        <Avatar key={i} id={i} size={size} />
      ))}
      {ids.length > max && (
        <span
          className={cn('inline-grid shrink-0 place-items-center rounded-full avatar-tint font-semibold ring-[1.5px] ring-background', AV_SIZE[size])}
          style={{ '--c': 'var(--gray)' }}
        >{`+${ids.length - max}`}</span>
      )}
    </span>
  );
}

/** The status glyph: dashed ring (backlog), ring (to do), half (in progress), three quarters (review), filled check (done). */
export function StatusIcon({ st, className }: { st: Status; className?: string }) {
  const c = `var(--st-${st})`;
  const r = 5.4;
  let inner: ReactNode;
  if (st === 'backlog') inner = <circle cx="7" cy="7" r={r} fill="none" stroke={c} strokeWidth="1.5" strokeDasharray="1.9 2.1" />;
  else if (st === 'todo') inner = <circle cx="7" cy="7" r={r} fill="none" stroke={c} strokeWidth="1.5" />;
  else if (st === 'progress')
    inner = (
      <>
        <circle cx="7" cy="7" r={r} fill="none" stroke={c} strokeWidth="1.5" />
        <path d="M7 3.4A3.6 3.6 0 0 1 7 10.6Z" fill={c} />
      </>
    );
  else if (st === 'review')
    inner = (
      <>
        <circle cx="7" cy="7" r={r} fill="none" stroke={c} strokeWidth="1.5" />
        <path d="M7 3.4A3.6 3.6 0 1 1 3.4 7L7 7Z" fill={c} />
      </>
    );
  else
    inner = (
      <>
        <circle cx="7" cy="7" r="6.2" fill={c} />
        <path d="M4.4 7.2 6.2 9 9.7 5.3" fill="none" stroke="var(--background)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </>
    );
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true" className={cn('size-3.5 shrink-0', className)}>
      {inner}
    </svg>
  );
}
/** Priority bars; urgent is a red tile, none is three dashes. */
export function PriorityIcon({ p, className }: { p: Priority | null | undefined; className?: string }) {
  const cls = cn('size-3.5 shrink-0', className);
  if (p === 'urgent')
    return (
      <svg viewBox="0 0 14 14" aria-hidden="true" className={cls}>
        <rect x="1" y="1" width="12" height="12" rx="3" fill="var(--red)" />
        <path d="M7 3.8v4" stroke="var(--color-white)" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="7" cy="10.1" r=".95" fill="var(--color-white)" />
      </svg>
    );
  if (!p || p === 'none')
    return (
      <svg viewBox="0 0 14 14" aria-hidden="true" className={cls}>
        <path d="M2.5 7h2M6 7h2M9.5 7h2" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  const w = PR[p].w;
  const bar = (x: number, h: number, on: boolean) => <rect x={x} y={12 - h} width="2.6" height={h} rx="1" fill={on ? 'var(--fg-2)' : 'var(--input)'} />;
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true" className={cls}>
      {bar(1.8, 4.5, w >= 1)}
      {bar(5.7, 7.5, w >= 2)}
      {bar(9.6, 10.5, w >= 3)}
    </svg>
  );
}
export const StatusPill = ({ st }: { st: Status }) => (
  <>
    <StatusIcon st={st} />
    <span>{ST[st].name}</span>
  </>
);
export const PriorityPill = ({ p }: { p: Priority | null | undefined }) => (
  <>
    <PriorityIcon p={p} />
    <span>{PR[p || 'none'].name}</span>
  </>
);
/** A coloured square dot; `round` for project status. Colour from data (`c`). */
export const Dot = ({ c, round = false, className }: { c: string; round?: boolean; className?: string }) => (
  <span className={cn('size-2 shrink-0 bg-(--c)', round ? 'rounded-full' : 'rounded-[3px]', className)} style={{ '--c': c }} />
);
export const Label = ({ id }: { id: LabelId }) => (
  <Badge variant="outline" className="h-5 gap-1.25 rounded-[5px] bg-background pr-1.75 pl-1.5 font-normal text-fg-2">
    <Dot c={LB[id].c} className="size-1.5 rounded-[2px]" />
    {LB[id].name}
  </Badge>
);
/** A project's icon on a tint of its colour. Size the tile with `className` (default 28px). */
export const ProjectIcon = ({ p, className }: { p: Pick<Project, 'icon' | 'color'>; className?: string }) => (
  <span className={cn('grid size-7 shrink-0 place-items-center rounded-md bg-(--c)/16 text-tint [&_svg]:size-[55%]', className)} style={{ '--c': pColor(p) }}>
    <Icon name={p.icon} />
  </span>
);
export const ProjectStatusBadge = ({ s }: { s: ProjectStatus }) => (
  <Badge variant="outline" className="h-5 gap-1.25 rounded-[5px] bg-background px-1.75 text-fg-2">
    <Dot c={PSTAT[s].c} round className="size-1.5" />
    {PSTAT[s].name}
  </Badge>
);
/** Relative due date, red when overdue and amber when due within a day. Nothing when the task has no due date. */
export function Due({ t, icon = true }: { t: Pick<Task, 'due' | 'status'>; icon?: boolean }) {
  if (!t.due) return null;
  const n = diffD(parse(t.due), TODAY);
  const tone = t.status === 'done' ? 'text-fg-2' : n < 0 ? 'text-red' : n <= 1 ? 'text-amber' : 'text-fg-2';
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs tabular-nums', tone)}>
      {icon && <Icon name="calendar" className="size-3" />}
      {relDate(t.due)}
    </span>
  );
}
export const ProgressBar = ({ v, className }: { v: number; className?: string }) => <Progress value={v} className={cn('min-w-10 flex-1', className)} />;

/** An empty state: glyph, title, text, and an optional action (`children`). `level` sets the heading level. */
export function Empty({
  icon,
  title,
  text,
  children,
  className,
  level = 2,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
  children?: ReactNode;
  className?: string;
  level?: 1 | 2 | 3 | 4;
  tone?: 'error';
}) {
  const G = icon;
  const H = `h${level}` as const;
  return (
    <EmptyRoot className={cn('gap-1.5 px-6 py-14', className)}>
      <EmptyHeader className="gap-1.5">
        <EmptyMedia className={cn('mb-1 text-fg-4 [&_svg]:size-5.5', tone === 'error' && 'text-red')}>
          <G />
        </EmptyMedia>
        <EmptyTitle className="text-md font-semibold">
          <H>{title}</H>
        </EmptyTitle>
        <EmptyDescription className="max-w-85 text-sm text-fg-2">{text}</EmptyDescription>
      </EmptyHeader>
      {children && <EmptyContent className="mt-2.5">{children}</EmptyContent>}
    </EmptyRoot>
  );
}

/** The first case-insensitive match of `q` in `text`, highlighted. */
export function Highlight({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-primary-soft px-px text-foreground">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}
/** Comment text where `@Full Name` mentions of workspace members are highlighted. */
export function CommentText({ text }: { text: string }) {
  const names = useStore(s => s.data.members)
    .map(m => m.name)
    .sort((a, b) => b.length - a.length);
  if (!names.length) return text;
  const re = new RegExp(`(@(?:${names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}))`);
  return text.split(re).map((part, i) =>
    i % 2 ? (
      <span key={i} className="rounded-sm bg-primary-soft px-0.5 font-medium text-primary">
        {part}
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

const line = 'block h-1 rounded-[2px] bg-muted-strong';
/**
 * A drawn thumbnail per file type with the extension badge. Size it with `className` or `style`. `lg` scales the art with the preview's
 * width, for a full-size preview. It sets Tailwind's spacing unit from the container width, so the art's spacing utilities grow with it.
 */
export function FilePreview({
  f,
  size = 'default',
  className,
  style,
}: {
  f: Pick<Attachment, 'type' | 'name'>;
  size?: 'default' | 'lg';
  className?: string;
  style?: CSSProperties;
}) {
  const t = FT[f.type];
  const mix = (pct: number) => `color-mix(in srgb, var(--c) ${pct}%, var(--background))`;
  let art: ReactNode;
  if (f.type === 'img')
    art = (
      <div className="absolute inset-0" style={{ background: `linear-gradient(135deg,${mix(35)},${mix(10)})` }}>
        <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="size-full">
          <path d="M0 60 L30 28 L52 46 L70 32 L100 58 L100 60Z" fill={mix(45)} />
          <circle cx="76" cy="16" r="7" fill={mix(30)} />
        </svg>
      </div>
    );
  else if (f.type === 'sheet')
    art = (
      <div className="grid w-full grid-cols-4 gap-0.75">
        {Array.from({ length: 20 }, (_, i) => (
          <i key={i} className={line} />
        ))}
      </div>
    );
  else if (f.type === 'fig')
    art = (
      <div className="flex w-full gap-1.5">
        <div className="flex flex-1 flex-col gap-1.25">
          <i className={cn(line, 'w-1/2 bg-input')} />
          <i className={line} />
          <i className={cn(line, 'w-[70%]')} />
          <i className="block h-4.5 rounded-[2px]" style={{ background: mix(20) }} />
        </div>
        <div className="w-[34%] rounded-[3px]" style={{ background: mix(14) }} />
      </div>
    );
  else if (f.type === 'zip') art = <FolderArchive className="size-7.5 text-(--c)" />;
  else
    art = (
      <div className="flex w-full flex-col gap-1.25">
        <i className={cn(line, 'w-1/2 bg-input')} />
        <i className={line} />
        <i className={line} />
        <i className={cn(line, 'w-4/5')} />
        <i className={line} />
        <i className={cn(line, 'w-3/5')} />
      </div>
    );
  return (
    <div className={cn('relative overflow-hidden rounded-md bg-muted', size === 'lg' && '@container', className)} style={{ '--c': t.c, ...style }}>
      <div className={cn('absolute inset-0 flex items-center justify-center p-3', size === 'lg' && '[--spacing:2cqw]')}>{art}</div>
      <span className="absolute right-1.5 bottom-1.5 rounded-sm bg-(--c) px-1 py-px font-mono text-[9.5px] font-semibold text-white uppercase">
        {(f.name.split('.').pop() || '').slice(0, 4)}
      </span>
    </div>
  );
}
