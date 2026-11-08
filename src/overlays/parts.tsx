/* Small pieces the drawer, the subtask view and the task form share. */
import type { ComponentType, ReactNode } from 'react';

/** Task descriptions are stored as HTML, so plain text typed into a form is escaped before it is wrapped in `<p>`. */
export const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

/** A drawer section: a heading row with a count, optional extras and actions, then the body. */
export function Section({
  title,
  titleId,
  count,
  extra,
  actions,
  children,
}: {
  title: string;
  titleId?: string;
  count?: ReactNode;
  extra?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mt-6.5">
      <div className="mb-2 flex items-center gap-2">
        <h3 id={titleId} className="text-base font-semibold">
          {title}
        </h3>
        {count != null && <span className="text-xs text-muted-foreground tabular-nums">{count}</span>}
        {extra}
        {actions && <div className="ml-auto flex gap-0.5">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/** One property row of the drawer's key/value list. */
export function PropRow({ icon: I, label, children }: { icon: ComponentType<{ className?: string }>; label: string; children: ReactNode }) {
  return (
    <>
      <dt className="flex h-7.5 items-center gap-1.75 text-fg-2">
        <I className="size-3.5 text-fg-4" />
        {label}
      </dt>
      <dd className="flex min-h-7.5 min-w-0 flex-wrap items-center gap-1">{children}</dd>
    </>
  );
}
