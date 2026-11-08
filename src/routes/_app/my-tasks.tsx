import { createFileRoute } from '@tanstack/react-router';
import { MyTasksPage } from '../../pages/my-tasks';

export const Route = createFileRoute('/_app/my-tasks')({ component: MyTasksPage });
