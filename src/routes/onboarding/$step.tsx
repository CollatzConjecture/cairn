import { createFileRoute, notFound } from '@tanstack/react-router';
import { OnboardingPage } from '../../auth/onboarding';

export const Route = createFileRoute('/onboarding/$step')({
  beforeLoad: ({ params }) => {
    if (!/^[0-5]$/.test(params.step)) throw notFound();
  },
  component: function OnboardingRoute() {
    return <OnboardingPage step={Number(Route.useParams().step)} />;
  },
});
