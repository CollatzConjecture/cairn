import { createFileRoute } from '@tanstack/react-router';
import { VerifyPage } from '../auth/verify';

export const Route = createFileRoute('/verify')({ component: VerifyPage });
