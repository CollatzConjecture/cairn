import { createFileRoute } from '@tanstack/react-router';
import { TimelinePage } from '../../project/timeline';

export const Route = createFileRoute('/_app/timeline')({ component: TimelinePage });
