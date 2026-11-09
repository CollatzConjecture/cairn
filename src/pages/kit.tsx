/* Page building blocks shared by the workspace pages and settings. */
import type { ComponentProps, ReactNode } from 'react';
import { Check, Search } from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

/** The centred content column. Pass a `max-w-*` to narrow or widen it. */
export const Page = ({ className, ...props }: ComponentProps<'div'>) => (
  <div className={cn('mx-auto max-w-290 px-(--gutter) pt-7 pb-18 max-md:pt-5 max-md:pb-24', className)} {...props} />
);

/** Page title, a line under it, and actions on the right (full width below 640px). */
export function PageHeader({ title, sub, children, className }: { title: ReactNode; sub?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-5 flex flex-wrap items-start gap-3', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl leading-[1.2] font-semibold tracking-[-0.022em] text-balance max-sm:text-xl">{title}</h1>
        {sub && <p className="mt-1 text-fg-2">{sub}</p>}
      </div>
      {children && <div className="ml-auto flex flex-wrap items-center gap-1.5 max-sm:ml-0 max-sm:w-full">{children}</div>}
    </div>
  );
}

/** Four headline numbers in one bordered strip, two by two below 900px. */
export const Stats = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div
    className={cn(
      'grid grid-cols-4 overflow-hidden rounded-xl border *:not-first:border-l max-md:grid-cols-2 max-md:*:nth-3:border-l-0 max-md:*:nth-[n+3]:border-t',
      className,
    )}
  >
    {children}
  </div>
);

const statCls = 'flex flex-col gap-1.5 px-4 py-3.5 text-left';
/** One headline number. With `onClick` it is a button that fills on hover. `tone` colours the number and the note. */
export function Stat({
  k,
  v,
  d,
  icon,
  tone,
  onClick,
}: {
  k: string;
  v: string | number;
  d?: ReactNode;
  icon?: ReactNode;
  tone?: 'up' | 'bad';
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className="flex items-center gap-1.5 text-sm text-fg-2 [&_svg]:size-3.5">
        {icon}
        {k}
      </span>
      <span className={cn('text-[22px] leading-[1.1] font-semibold tracking-[-0.02em] tabular-nums', tone === 'bad' && 'text-red')}>{v}</span>
      {d != null && <span className={cn('text-xs text-muted-foreground', tone === 'up' && 'text-green', tone === 'bad' && 'text-red')}>{d}</span>}
    </>
  );
  return onClick ? (
    <button className={cn(statCls, 'transition-colors hover:bg-muted')} onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className={statCls}>{body}</div>
  );
}

/** A bordered card. Rows inside draw their own separators. */
export const Panel = ({ className, children, label }: { className?: string; children: ReactNode; label?: string }) => (
  <section className={cn('min-w-0 overflow-hidden rounded-xl border bg-card', className)} aria-label={label}>
    {children}
  </section>
);
/** The panel's title with actions on the right. */
export function PanelHeader({ title, children, className }: { title: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 px-3.5 pt-3 pb-2.5 max-sm:flex-wrap', className)}>
      <h2 className="font-semibold whitespace-nowrap">{title}</h2>
      {children && <div className="ml-auto flex items-center gap-1">{children}</div>}
    </div>
  );
}

/** The two-column dashboard grid, one column below 1100px. */
export const Grid2 = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div className={cn('grid grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-4 max-[1100px]:grid-cols-1', className)}>{children}</div>
);
export const Stack = ({ children }: { children: ReactNode }) => <div className="flex min-w-0 flex-col gap-4">{children}</div>;

/** An uppercase group label above a run of items (Today, Yesterday, …). */
export const DayHeading = ({ children }: { children: ReactNode }) => (
  <h2 className="pt-3.5 pb-1 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">{children}</h2>
);
export const Eyebrow = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('text-2xs font-semibold tracking-[0.07em] text-muted-foreground uppercase', className)}>{children}</div>
);
/** A count after a tab or heading label. */
export const Count = ({ n }: { n: number }) => <span className="text-2xs font-medium text-muted-foreground tabular-nums">{n}</span>;

/** An activity feed with a timeline line joining consecutive avatars. Children are `ActivityItem`s. */
export const Feed = ({ children, lined = true }: { children: ReactNode; lined?: boolean }) => (
  <div
    className={cn(
      'flex flex-col',
      lined &&
        '*:not-last:before:absolute *:not-last:before:top-8 *:not-last:before:-bottom-1 *:not-last:before:left-2.5 *:not-last:before:w-px *:not-last:before:bg-border',
    )}
  >
    {children}
  </div>
);

export type TabItem<V extends string> = { value: V; label: ReactNode; count?: number; icon?: ReactNode; aria?: string };
const pick = <V extends string>(items: readonly TabItem<V>[], v: unknown) => items.find(i => i.value === v)?.value;

/** A small segmented control (tabs semantics, arrow keys move between options). */
export function Seg<V extends string>({
  value,
  onChange,
  items,
  label,
  className,
  itemClassName,
}: {
  value: V;
  onChange: (v: V) => void;
  items: readonly TabItem<V>[];
  label: string;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <Tabs
      value={value}
      onValueChange={v => {
        const hit = pick(items, v);
        if (hit) onChange(hit);
      }}
      className="w-fit max-w-full"
    >
      <TabsList
        aria-label={label}
        className={cn('max-w-full gap-0.5 overflow-x-auto rounded-md bg-muted-strong p-0.5 group-data-horizontal/tabs:h-7', className)}
      >
        {items.map(i => (
          <TabsTrigger
            key={i.value}
            value={i.value}
            aria-label={i.aria}
            className={cn(
              'h-6 flex-none gap-1.25 rounded-[5px] border-0 px-2.25 text-xs text-fg-2 hover:text-foreground data-active:bg-background data-active:text-foreground data-active:shadow-card dark:data-active:bg-background [&_svg:not([class*=size-])]:size-3.25',
              itemClassName,
            )}
          >
            {i.icon}
            {i.label}
            {i.count != null && <span className="font-normal text-muted-foreground tabular-nums">{i.count}</span>}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/** Underlined text tabs on a bottom border. */
export function LineTabs<V extends string>({
  value,
  onChange,
  items,
  label,
  className,
  listClassName,
  itemClassName,
}: {
  value: V;
  onChange: (v: V) => void;
  items: readonly TabItem<V>[];
  label: string;
  /** Layout of the whole strip (margins, side padding); the bottom border spans it. */
  className?: string;
  listClassName?: string;
  itemClassName?: string;
}) {
  return (
    <Tabs
      value={value}
      onValueChange={v => {
        const hit = pick(items, v);
        if (hit) onChange(hit);
      }}
      className={cn('gap-0 border-b', className)}
    >
      {/* The list overlaps the strip's border by 1px so the active underline sits on it without being clipped by the scroller. */}
      <TabsList
        variant="line"
        aria-label={label}
        className={cn('-mb-px h-9! w-full [scrollbar-width:none] justify-start gap-0.5 overflow-x-auto rounded-none p-0', listClassName)}
      >
        {items.map(i => (
          <TabsTrigger
            key={i.value}
            value={i.value}
            aria-label={i.aria}
            className={cn(
              'h-full flex-none gap-1.5 rounded-none border-0 px-2.5 text-sm text-fg-2 group-data-horizontal/tabs:after:inset-x-2 group-data-horizontal/tabs:after:bottom-0 group-data-horizontal/tabs:after:rounded-[2px] hover:text-foreground data-active:text-foreground',
              itemClassName,
            )}
          >
            {i.icon}
            {i.label}
            {i.count != null && <Count n={i.count} />}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/** Cell styles for the dashboard and directory tables on shadcn `Table`: 12.5px text, divider rows, 14px outer edge. */
export const tc = {
  table: 'text-sm',
  head: 'h-auto px-2 py-2.25 text-xs font-medium text-fg-2 first:pl-3.5 last:pr-3.5',
  row: 'border-b border-divider hover:bg-transparent',
  /** A row whose first cell holds a stretched link: the whole row navigates. */
  link: 'relative border-b border-divider hover:bg-muted',
  cell: 'px-2 py-2.25 first:pl-3.5 last:pr-3.5',
};
/** `ProgressBar` colours for a project at risk or complete. */
export const barTone = { red: '**:data-[slot=progress-indicator]:bg-red', green: '**:data-[slot=progress-indicator]:bg-green', none: '' };
/** A stretched link/button: its `::after` covers the nearest `relative` ancestor so the whole row or card is clickable. */
export const stretched =
  'text-left outline-none after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring';

/** Items grouped by key, groups in first-seen order. */
export function groupBy<T>(xs: readonly T[], key: (x: T) => string): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const x of xs) {
    const k = key(x);
    const g = m.get(k);
    if (g) g.push(x);
    else m.set(k, [x]);
  }
  return [...m];
}

export type Option<V extends string> = { value: V; label: string };
/** A shadcn Select over a fixed option list; `onChange` gets the option's own typed value. */
export function SelectField<V extends string>({
  value,
  onChange,
  options,
  label,
  size = 'default',
  className,
}: {
  value: V;
  onChange: (v: V) => void;
  options: readonly Option<V>[];
  label: string;
  size?: 'sm' | 'default';
  className?: string;
}) {
  return (
    <Select
      items={options}
      value={value}
      onValueChange={v => {
        const hit = options.find(o => o.value === v);
        if (hit) onChange(hit.value);
      }}
    >
      <SelectTrigger size={size} className={cn(size === 'sm' && 'text-xs', className)} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(o => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** The small search field of list toolbars. */
export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  return (
    <InputGroup className={cn('h-6.5 w-50 rounded-md', className)}>
      <InputGroupAddon className="pl-2 [&>svg]:size-3.25 [&>svg]:text-fg-4">
        <Search />
      </InputGroupAddon>
      <InputGroupInput
        className="text-sm"
        type="search"
        placeholder={placeholder}
        aria-label={label}
        value={value}
        onChange={e => onChange(e.currentTarget.value)}
      />
    </InputGroup>
  );
}

/** A radio group of colour dots: accent, workspace, avatar and team colours. Colours arrive as data. */
export function Swatches<V extends string>({
  value,
  onChange,
  options,
  label,
  className,
  size = 'size-5.5',
  accentScope = false,
}: {
  value: V;
  onChange: (v: V) => void;
  options: readonly { value: V; c: string; label: string }[];
  label: string;
  className?: string;
  size?: string;
  /** Each dot sets `data-accent` to its value, so `var(--acc-l)` reads that accent's colour. */
  accentScope?: boolean;
}) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)} role="radiogroup" aria-label={label}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          aria-label={o.label}
          title={o.label}
          className={cn(
            'grid shrink-0 place-items-center rounded-full bg-(--c) text-white transition-transform active:scale-[0.94]',
            size,
            value === o.value && 'ring-2 ring-(--c) ring-offset-2 ring-offset-background',
          )}
          style={{ '--c': o.c }}
          data-accent={accentScope ? o.value : undefined}
          onClick={() => onChange(o.value)}
        >
          {value === o.value && <Check className="size-3" />}
        </button>
      ))}
    </div>
  );
}

const CALLOUT = {
  info: 'bg-primary-soft [&>svg]:text-primary',
  ok: 'bg-green/10 [&>svg]:text-green',
  warn: 'bg-amber/10 [&>svg]:text-amber',
  danger: 'bg-red/10 [&>svg]:text-red',
};
/** A tinted note with a coloured glyph. Danger is announced as an alert, the rest as status. */
export function Callout({
  tone,
  icon: I,
  children,
  className,
}: {
  tone: keyof typeof CALLOUT;
  icon: React.ComponentType<{ className?: string }>;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-sm [&>svg]:mt-px [&>svg]:size-3.75 [&>svg]:shrink-0', CALLOUT[tone], className)}
    >
      <I />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
