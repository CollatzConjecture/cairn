/* Full-page error states. */
import type { ReactNode } from 'react';
import { ArrowLeft, CloudExclamationPoint, FileQuestionMark, Lock, RefreshCw, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Project } from '../domain/schema';
import { back, go, memberById, requestAccess, useStore } from '../store';

function FullState({
  icon: G,
  code,
  title,
  error = false,
  children,
  actions,
}: {
  icon: LucideIcon;
  code?: string;
  title: string;
  error?: boolean;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="grid min-h-full place-items-center px-5 py-10">
      <div className="flex max-w-105 flex-col items-center gap-2 text-center">
        <G className={cn('mb-1 size-5.5', error ? 'text-red' : 'text-fg-4')} aria-hidden="true" />
        {code && <span className="font-mono text-xs tracking-[0.08em] text-muted-foreground">{code}</span>}
        <h1 className="text-xl font-semibold tracking-[-0.015em]">{title}</h1>
        <p className="mb-3 text-fg-2">{children}</p>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
    </div>
  );
}

export function Page404() {
  return (
    <FullState
      icon={FileQuestionMark}
      code="ERROR 404"
      title="Page not found"
      actions={
        <>
          <Button variant="outline" onClick={back}>
            <ArrowLeft />
            Go back
          </Button>
          <Button onClick={() => go({ r: 'home' })}>Go to Home</Button>
        </>
      }
    >
      The page you&apos;re looking for was moved, deleted, or never existed. Check the link or head back home.
    </FullState>
  );
}
/** A private project the current member is not on. */
export function StateDenied({ p }: { p: Project | null }) {
  const lead = useStore(s => memberById(s.data, p?.lead));
  return (
    <FullState
      icon={Lock}
      code="ERROR 403"
      title="You don't have access"
      actions={
        <>
          <Button variant="outline" onClick={() => go({ r: 'projects' })}>
            Back to projects
          </Button>
          <Button onClick={() => requestAccess(p?.id ?? null)}>Request access</Button>
        </>
      }
    >
      {p && <b className="font-semibold text-foreground">{p.name}</b>}
      {`${p ? ' is a private project. ' : ''}Ask ${lead ? lead.name : 'the project owner'} to add you, or request access and we'll let them know.`}
    </FullState>
  );
}
/** Shown in place of a page that threw while rendering; `reset` re-renders it. */
export function StateFailed({ reset }: { reset: () => void }) {
  return (
    <FullState
      icon={CloudExclamationPoint}
      error
      title="Something went wrong."
      actions={
        <>
          <Button variant="outline" onClick={() => go({ r: 'home' })}>
            Go to Home
          </Button>
          <Button onClick={reset}>
            <RefreshCw />
            Try again
          </Button>
        </>
      }
    >
      This page failed to load. Your data is safe — try again in a moment.
    </FullState>
  );
}
