import { createFileRoute } from '@tanstack/react-router';
import { ForgotPage } from '../../auth/forgot';

export const Route = createFileRoute('/forgot/')({ component: ForgotPage });
