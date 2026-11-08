import { useEffect } from 'react';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { go, set, toast, useStore } from '../store';
import { AuthCard, AuthFoot, AuthShell, Glyph, TextLink } from './auth-shell';

/** The account is active; set up a fresh workspace. */
function verified() {
  set(s => {
    s.ui.onbData.ws = '';
    s.ui.onbData.url = '';
    s.ui.onbData.urlTouched = false;
  });
  go({ r: 'onboarding', step: 0 });
}

export function VerifyPage() {
  const email = useStore(s => s.ui.af.email);
  const t = useStore(s => s.ui.resendT);
  const ticking = t > 0;
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(
      () =>
        set(s => {
          s.ui.resendT = Math.max(0, s.ui.resendT - 1);
        }),
      1000,
    );
    return () => clearInterval(id);
  }, [ticking]);
  return (
    <AuthShell>
      <AuthCard
        glyph={
          <Glyph tone="primary">
            <Mail />
          </Glyph>
        }
        title="Verify your email"
        sub={
          <>
            We sent a verification link to <b className="font-semibold text-foreground">{email}</b>. Click it to activate your account.
          </>
        }
      >
        <div className="flex items-center gap-2.5 rounded-xl border bg-card px-3.5 py-3" role="status">
          <span className="size-2 animate-pulse rounded-full bg-muted-strong" />
          <span className="text-[13px] text-fg-2">Waiting for verification…</span>
        </div>
        <Button size="lg" className="w-full" onClick={verified}>
          I&apos;ve verified my email
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          disabled={ticking}
          onClick={() => {
            set(s => {
              s.ui.resendT = 30;
            });
            toast(`Verification email sent to ${email}`);
          }}
        >
          {ticking ? (
            <>
              Resend email in <span className="tabular-nums">{t}</span>s
            </>
          ) : (
            'Resend email'
          )}
        </Button>
        <AuthFoot>
          Wrong email? <TextLink onClick={() => go({ r: 'signup' })}>Change it</TextLink>
        </AuthFoot>
      </AuthCard>
    </AuthShell>
  );
}
