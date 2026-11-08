import { ArrowLeft, Info, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Callout } from '../pages/kit';
import { go, toast, useStore } from '../store';
import { AuthCard, AuthFoot, AuthShell, Glyph, TextLink } from './auth-shell';

export function ForgotSentPage() {
  const email = useStore(s => s.ui.af.email);
  return (
    <AuthShell>
      <AuthCard
        glyph={
          <Glyph tone="green">
            <MailCheck />
          </Glyph>
        }
        title="Check your email"
        sub={
          <>
            We sent a reset link to <b className="font-semibold text-foreground">{email}</b>. It expires in 30 minutes.
          </>
        }
      >
        <Button size="lg" className="w-full" onClick={() => go({ r: 'reset' })}>
          Open reset link
        </Button>
        <Callout tone="info" icon={Info}>
          In this prototype, the button above stands in for the link in your email.
        </Callout>
        <AuthFoot>
          Didn&apos;t get it? <TextLink onClick={() => toast(`Reset link sent to ${email}`)}>Resend email</TextLink>
        </AuthFoot>
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
