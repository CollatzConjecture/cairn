import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/onboarding/')({
  beforeLoad: () => {
    throw redirect({ to: '/onboarding/$step', params: { step: '0' }, replace: true });
  },
});
