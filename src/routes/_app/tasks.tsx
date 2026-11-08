import { createFileRoute } from '@tanstack/react-router';
import { TasksPage } from '../../pages/tasks';

export const Route = createFileRoute('/_app/tasks')({ component: TasksPage });
