import { createFileRoute } from '@tanstack/react-router';
import { ResetDonePage } from '../../auth/reset-done';

export const Route = createFileRoute('/reset/done')({ component: ResetDonePage });
