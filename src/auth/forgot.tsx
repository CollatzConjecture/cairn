import { useState } from 'react';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { go, set, useStore } from '../store';
import { FormField, field, invalid, useBusy } from '../settings/parts';
import { AuthCard, AuthFoot, AuthShell, EMAIL_RE, Glyph, TextLink, lg } from './auth-shell';

export function ForgotPage() {
  const email = useStore(s => s.ui.af.email);
  const [err, setErr] = useState<string | null>(null);
  const [busy, run] = useBusy();
  return (
    <AuthShell>
      <AuthCard
        glyph={
          <Glyph tone="primary">
            <KeyRound />
          </Glyph>
        }
        title="Reset your password"
        sub="Enter your account email and we'll send you a reset link."
      >
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={e => {
            e.preventDefault();
            const em = field(new FormData(e.currentTarget), 'email').trim();
            set(s => {
              s.ui.af.email = em;
            });
            if (!EMAIL_RE.test(em)) return setErr('Enter the email you use to sign in');
            setErr(null);
            run(700, () => go({ r: 'forgot-sent' }));
          }}
        >
          <FormField id="f-email" label="Email" error={err}>
            <Input {...invalid('f-email', err)} className={lg} name="email" type="email" defaultValue={email} autoComplete="email" />
          </FormField>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy && <Spinner />}
            Send reset link
          </Button>
        </form>
        <AuthFoot>
          <TextLink className="inline-flex items-center gap-1.5" onClick={() => go({ r: 'login' })}>
            <ArrowLeft className="size-3.5" />
            Back to sign in
          </TextLink>
        </AuthFoot>
      </AuthCard>
    </AuthShell>
  );
}
