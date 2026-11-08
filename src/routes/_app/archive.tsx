import { createFileRoute } from '@tanstack/react-router';
import { ArchivePage } from '../../pages/archive';

export const Route = createFileRoute('/_app/archive')({ component: ArchivePage });
