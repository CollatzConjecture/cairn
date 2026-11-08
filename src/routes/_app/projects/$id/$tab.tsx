import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { fileId, projectId } from '../../../../domain/ids';
import { ProjectPage } from '../../../../project/project';
import { Page404 } from '../../../../shell/errors';
import { get, isProjectTab, openTask, previewFile } from '../../../../store';

/** A copied link names the overlay to open: `?task=<key>` (the task drawer) or `?file=<id>` (the file preview). */
type LinkSearch = { task?: string; file?: string };

export const Route = createFileRoute('/_app/projects/$id/$tab')({
  validateSearch: (s: Record<string, unknown>): LinkSearch => ({
    task: typeof s.task === 'string' ? s.task : undefined,
    file: typeof s.file === 'string' ? s.file : undefined,
  }),
  component: function ProjectRoute() {
    const { id, tab } = Route.useParams();
    const { task, file } = Route.useSearch();
    const navigate = Route.useNavigate();
    // Opening a modal stacks it, so a query is consumed once even when Strict Mode runs the effect twice.
    const consumed = useRef('');
    useEffect(() => {
      if (!task && !file) {
        consumed.current = '';
        return;
      }
      const q = `${task}|${file}`;
      if (consumed.current === q) return;
      consumed.current = q;
      // A navigation closes the drawer on narrow screens, so the query is dropped first and the overlay opens after.
      void navigate({ search: {}, replace: true }).then(() => {
        const t = task && get().data.tasks.find(x => x.key === task);
        if (t) openTask(t.id);
        if (file) previewFile(fileId(file));
      });
    }, [task, file, navigate]);
    return isProjectTab(tab) ? <ProjectPage id={projectId(id)} tab={tab} /> : <Page404 />;
  },
});
