import { createFileRoute } from '@tanstack/react-router';
import { CalendarPage } from '../../project/calendar';

export const Route = createFileRoute('/_app/calendar')({ component: CalendarPage });
