import { createFileRoute } from '@tanstack/react-router';
import { LoginPage } from '../auth/login';

export const Route = createFileRoute('/login')({ component: LoginPage });
