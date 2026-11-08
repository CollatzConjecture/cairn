import { createFileRoute } from '@tanstack/react-router';
import { SearchPage } from '../../pages/search';

export const Route = createFileRoute('/_app/search')({ component: SearchPage });
