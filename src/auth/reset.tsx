import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { go, useStore } from '../store';
import { weakPw } from '../settings/account';
import { FormField, field, invalid, useBusy } from '../settings/parts';
import { StrengthMeter } from '../settings/strength';
import { AuthCard, AuthShell, lg } from './auth-shell';

type Errs = Partial<Record<'pw' | 'pw2', string>>;

export function ResetPage() {
  const email = useStore(s => s.ui.af.email);
  const [pw, setPw] = useState('');
  const [errs, setErrs] = useState<Errs>({});
  const [busy, run] = useBusy();
  return (
    <AuthShell>
      <AuthCard title="Choose a new password" sub={`for ${email}`}>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={e => {
            e.preventDefault();
            const pw2 = field(new FormData(e.currentTarget), 'pw2');
            const next: Errs = {};
            if (weakPw(pw)) next.pw = 'Use at least 10 characters, including a number or symbol';
            if (pw !== pw2) next.pw2 = "Passwords don't match";
            setErrs(next);
            if (Object.keys(next).length) return;
            run(700, () => go({ r: 'reset-done' }));
          }}
        >
          <FormField id="r-pw" label="New password" error={errs.pw}>
            <Input
              {...invalid('r-pw', errs.pw)}
              className={lg}
              type="password"
              autoComplete="new-password"
              value={pw}
              onChange={e => setPw(e.currentTarget.value)}
            />
            <StrengthMeter pw={pw} />
          </FormField>
          <FormField id="r-pw2" label="Confirm password" error={errs.pw2}>
            <Input {...invalid('r-pw2', errs.pw2)} className={lg} name="pw2" type="password" autoComplete="new-password" />
          </FormField>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy && <Spinner />}
            Reset password
          </Button>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
