import { createFileRoute } from '@tanstack/react-router';
import { TeamsPage } from '../../../pages/teams';

export const Route = createFileRoute('/_app/teams/')({ component: TeamsPage });
