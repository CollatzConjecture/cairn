import { createFileRoute } from '@tanstack/react-router';
import { ResetPage } from '../../auth/reset';

export const Route = createFileRoute('/reset/')({ component: ResetPage });
