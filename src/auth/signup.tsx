import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { go, set, useStore } from '../store';
import { weakPw } from '../settings/account';
import { FormField, field, invalid, useBusy } from '../settings/parts';
import { StrengthMeter } from '../settings/strength';
import { AuthCard, AuthFoot, AuthShell, EMAIL_RE, OrDivider, SocialButtons, TextLink, lg } from './auth-shell';

type Errs = Partial<Record<'name' | 'email' | 'pw', string>>;

export function SignupPage() {
  const name = useStore(s => s.ui.af.name);
  const [pw, setPw] = useState('');
  const [errs, setErrs] = useState<Errs>({});
  const [busy, run] = useBusy();
  return (
    <AuthShell
      action={
        <Button variant="ghost" size="sm" onClick={() => go({ r: 'login' })}>
          Log in
        </Button>
      }
    >
      <AuthCard title="Create your account" sub="Free for up to 3 members. No credit card required.">
        <SocialButtons />
        <OrDivider>or sign up with email</OrDivider>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={e => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const nm = field(f, 'name').trim();
            const em = field(f, 'email').trim();
            set(s => {
              s.ui.af = { name: nm, email: em };
            });
            const next: Errs = {};
            if (!nm) next.name = 'Enter your name';
            if (!EMAIL_RE.test(em)) next.email = 'Enter a valid work email';
            if (weakPw(pw)) next.pw = 'Use at least 10 characters, including a number or symbol';
            setErrs(next);
            if (Object.keys(next).length) return;
            run(800, () => {
              set(s => {
                s.ui.resendT = 30;
              });
              go({ r: 'verify' });
            });
          }}
        >
          <FormField id="s-name" label="Full name" error={errs.name}>
            <Input {...invalid('s-name', errs.name)} className={lg} name="name" defaultValue={name} autoComplete="name" placeholder="Jerry Lucas" />
          </FormField>
          <FormField id="s-email" label="Work email" error={errs.email}>
            <Input {...invalid('s-email', errs.email)} className={lg} name="email" type="email" autoComplete="email" placeholder="you@company.com" />
          </FormField>
          <FormField id="s-pw" label="Password" error={errs.pw} hint="At least 10 characters with a number or symbol.">
            <Input
              {...invalid('s-pw', errs.pw)}
              className={lg}
              type="password"
              autoComplete="new-password"
              value={pw}
              onChange={e => setPw(e.currentTarget.value)}
            />
            <StrengthMeter pw={pw} />
          </FormField>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy && <Spinner />}
            Create account
          </Button>
        </form>
        <p className="my-3.5 text-center text-xs text-muted-foreground">By creating an account you agree to the Terms and Privacy Policy.</p>
        <AuthFoot>
          Already have an account? <TextLink onClick={() => go({ r: 'login' })}>Sign in</TextLink>
        </AuthFoot>
      </AuthCard>
    </AuthShell>
  );
}
