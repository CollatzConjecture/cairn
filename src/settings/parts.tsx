/* Settings building blocks and the loading-button timer the forms share. */
import { useState, type ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

/** The section title and its one-line lead. */
export const SectionHead = ({ title, lead }: { title: string; lead: ReactNode }) => (
  <>
    <h1 className="mb-1 text-xl font-semibold tracking-[-0.015em]">{title}</h1>
    <p className="mb-6 text-fg-2">{lead}</p>
  </>
);

/** A setting with its control on the right. */
export function SRow({ title, desc, children, className }: { title: ReactNode; desc?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 border-b border-divider py-3.5 max-sm:gap-3', className)}>
      <div className="min-w-0">
        <div className="font-medium">{title}</div>
        {desc && <div className="mt-0.5 text-sm text-fg-2">{desc}</div>}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

/** A titled group of settings. */
export function SBlock({ title, children, className, danger = false }: { title: string; children: ReactNode; className?: string; danger?: boolean }) {
  return (
    <section className={cn('mt-7', className)} aria-label={title}>
      <h2 className={cn('mb-1 border-b pb-2 font-semibold', danger && 'text-red')}>{title}</h2>
      {children}
    </section>
  );
}

/** A setting that is a switch; the row title names it. */
export function ToggleRow({ title, desc, checked, onChange }: { title: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <SRow title={title} desc={desc}>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
    </SRow>
  );
}

/** A labelled form field with its error, or its hint when there is no error. */
export function FormField({
  id,
  label,
  error,
  hint,
  children,
  aside,
}: {
  id: string;
  label: string;
  error?: string | null;
  hint?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center">
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </Label>
        {aside && <span className="ml-auto">{aside}</span>}
      </div>
      {children}
      {error ? (
        <span id={`${id}-err`} className="flex items-center gap-1 text-xs text-destructive">
          <CircleAlert className="size-3" />
          {error}
        </span>
      ) : (
        hint && <span className="text-xs text-muted-foreground">{hint}</span>
      )}
    </div>
  );
}
/** Props that tie an input to its `FormField` error. */
export const invalid = (id: string, error: string | null | undefined) => ({ id, 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-err` : undefined });

/** `busy` while a simulated request runs, then `fn`. */
export function useBusy(): [boolean, (ms: number, fn: () => void) => void] {
  const [busy, setBusy] = useState(false);
  return [
    busy,
    (ms, fn) => {
      setBusy(true);
      setTimeout(() => {
        setBusy(false);
        fn();
      }, ms);
    },
  ];
}

/** Text of a submitted form field (FormData is the parse boundary). */
export const field = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === 'string' ? v : '';
};
