import { createFileRoute } from '@tanstack/react-router';
import { ForgotSentPage } from '../../auth/forgot-sent';

export const Route = createFileRoute('/forgot/sent')({ component: ForgotSentPage });
