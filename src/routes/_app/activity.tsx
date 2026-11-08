import { createFileRoute } from '@tanstack/react-router';
import { ActivityPage } from '../../pages/activity';

export const Route = createFileRoute('/_app/activity')({ component: ActivityPage });
