/* The frame every sign-in, sign-up and onboarding screen shares and what they all do on success. */
import { useState, type ReactNode } from 'react';
import { Apple, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { effectiveDark, get, go, set, toast, toggleDark, useStore } from '../store';
import { Logo } from '../ui/brand';
import { Tip } from '../ui/helpers';

export const EMAIL_RE = /^\S+@\S+\.\S+$/;
/** Large auth inputs. */
export const lg = 'h-9 text-base';

/** Leave the auth screens for the start page chosen in Preferences. */
export function enterApp(msg: string) {
  set(s => {
    s.ui.errors = {};
  });
  go({ r: get().prefs.home });
  toast(msg);
}

export function AuthShell({ children, action }: { children: ReactNode; action?: ReactNode }) {
  const dark = effectiveDark(useStore(s => s.prefs));
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-canvas">
      <header className="flex items-center justify-between px-6 py-4.5">
        <Logo h={22} />
        <div className="flex items-center gap-1">
          {action}
          <Tip label="Toggle theme">
            <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggleDark}>
              {dark ? <Sun /> : <Moon />}
            </Button>
          </Tip>
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-[6vh] pb-10">{children}</main>
      <footer className="p-4.5 text-center text-xs text-muted-foreground">© 2026 Cairn · Terms · Privacy</footer>
    </div>
  );
}

/** The centred column of an auth screen: an optional glyph, the title, a line under it, then the form. */
export function AuthCard({
  glyph,
  title,
  sub,
  children,
  className,
}: {
  glyph?: ReactNode;
  title: string;
  sub?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex w-full max-w-95 flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-250', className)}>
      <div className="flex justify-center">{glyph ?? <Logo h={30} />}</div>
      <h1 className="text-center text-2xl font-semibold tracking-[-0.022em]">{title}</h1>
      {sub && <p className="-mt-2 mb-1 text-center text-fg-2">{sub}</p>}
      {children}
    </div>
  );
}
/** The tinted square glyph above some auth titles (key, mail, check). */
export const Glyph = ({ tone, children }: { tone: 'primary' | 'green'; children: ReactNode }) => (
  <span
    className={cn(
      'grid size-11 place-items-center rounded-[11px] [&_svg]:size-5',
      tone === 'green' ? 'bg-green/14 text-green' : 'bg-primary-soft text-primary',
    )}
  >
    {children}
  </span>
);

export const OrDivider = ({ children }: { children: string }) => (
  <div className="flex items-center gap-2.5 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
    {children}
  </div>
);
export const TextLink = ({ children, onClick, className }: { children: ReactNode; onClick: () => void; className?: string }) => (
  <button type="button" className={cn('font-medium text-primary hover:underline hover:underline-offset-3', className)} onClick={onClick}>
    {children}
  </button>
);
/** The line under an auth form, such as the link to sign in instead. */
export const AuthFoot = ({ children }: { children: ReactNode }) => <p className="my-3.5 text-center text-sm text-fg-2">{children}</p>;

const GOOGLE = (
  <svg viewBox="0 0 48 48" className="size-4" aria-hidden="true">
    <path
      className="fill-amber"
      d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
    />
    <path className="fill-red" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path className="fill-green" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path className="fill-blue" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);
const MICROSOFT = (
  <svg viewBox="0 0 14 14" className="size-3.5" aria-hidden="true">
    <rect width="6.4" height="6.4" className="fill-orange" />
    <rect x="7.6" width="6.4" height="6.4" className="fill-green" />
    <rect y="7.6" width="6.4" height="6.4" className="fill-blue" />
    <rect x="7.6" y="7.6" width="6.4" height="6.4" className="fill-amber" />
  </svg>
);
const PROVIDERS = [
  ['Google', GOOGLE],
  ['Microsoft', MICROSOFT],
  ['Apple', <Apple key="a" className="size-3.75" />],
] as const;

/** Each signs in after a short wait. */
export function SocialButtons() {
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      {PROVIDERS.map(([name, glyph]) => (
        <Button
          key={name}
          type="button"
          variant="outline"
          size="lg"
          className="gap-2.5"
          disabled={!!busy}
          onClick={() => {
            setBusy(name);
            setTimeout(() => enterApp(`Signed in with ${name}`), 800);
          }}
        >
          {busy === name ? <Spinner /> : glyph}
          {`Continue with ${name}`}
        </Button>
      ))}
    </div>
  );
}
