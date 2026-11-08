import { createFileRoute } from '@tanstack/react-router';
import { StatesPage } from '../../pages/states';

export const Route = createFileRoute('/_app/states')({ component: StatesPage });
