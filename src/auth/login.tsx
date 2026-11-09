import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { go, set, useStore } from '../store';
import { FormField, field, invalid, useBusy } from '../settings/parts';
import { AuthCard, AuthFoot, AuthShell, EMAIL_RE, OrDivider, SocialButtons, TextLink, enterApp, lg } from './auth-shell';

type Errs = Partial<Record<'email' | 'pw', string>>;

export function LoginPage() {
  const email = useStore(s => s.ui.af.email);
  const ws = useStore(s => s.data.ws.name);
  const [show, setShow] = useState(false);
  const [errs, setErrs] = useState<Errs>({});
  const [busy, run] = useBusy();
  return (
    <AuthShell
      action={
        <Button variant="ghost" size="sm" onClick={() => go({ r: 'signup' })}>
          Sign up
        </Button>
      }
    >
      <AuthCard title="Welcome back" sub={`Sign in to ${ws}`}>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={e => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const em = field(f, 'email').trim();
            const pw = field(f, 'pw');
            set(s => {
              s.ui.af.email = em;
            });
            const next: Errs = {};
            if (!em) next.email = 'Enter your email address';
            else if (!EMAIL_RE.test(em)) next.email = 'Enter a valid email, like name@company.com';
            if (!pw) next.pw = 'Enter your password';
            setErrs(next);
            if (Object.keys(next).length) return;
            run(750, () => enterApp(`Signed in as ${em}`));
          }}
        >
          <FormField id="l-email" label="Email" error={errs.email}>
            <Input {...invalid('l-email', errs.email)} className={lg} name="email" type="email" defaultValue={email} autoComplete="email" />
          </FormField>
          <FormField
            id="l-pw"
            label="Password"
            error={errs.pw}
            aside={
              <TextLink className="text-sm" onClick={() => go({ r: 'forgot' })}>
                Forgot password?
              </TextLink>
            }
          >
            <InputGroup className="h-9 rounded-md">
              <InputGroupInput
                {...invalid('l-pw', errs.pw)}
                className="text-base"
                name="pw"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton size="icon-sm" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>
                  {show ? <EyeOff /> : <Eye />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </FormField>
          <Label className="gap-2 text-base font-normal">
            <Checkbox defaultChecked />
            Remember me for 30 days
          </Label>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy && <Spinner />}
            Sign in
          </Button>
        </form>
        <OrDivider>or</OrDivider>
        <SocialButtons />
        <AuthFoot>
          Don&apos;t have an account? <TextLink onClick={() => go({ r: 'signup' })}>Sign up</TextLink>
        </AuthFoot>
      </AuthCard>
    </AuthShell>
  );
}
