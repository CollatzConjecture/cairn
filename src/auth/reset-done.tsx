import { CircleCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { go } from '../store';
import { AuthCard, AuthShell, Glyph } from './auth-shell';

export function ResetDonePage() {
  return (
    <AuthShell>
      <AuthCard
        glyph={
          <Glyph tone="green">
            <CircleCheck />
          </Glyph>
        }
        title="Password updated"
        sub="You can now sign in with your new password."
      >
        <Button size="lg" className="w-full" onClick={() => go({ r: 'login' })}>
          Sign in
        </Button>
      </AuthCard>
    </AuthShell>
  );
}
