import { createFileRoute } from '@tanstack/react-router';
import { InboxPage } from '../../pages/inbox';

export const Route = createFileRoute('/_app/inbox')({ component: InboxPage });
