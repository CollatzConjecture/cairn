import { useRef, type ReactNode } from 'react';
import { History, Search, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { cn } from '@/lib/utils';
import { FT } from '../domain/constants';
import { ago } from '../domain/date';
import { linkTo } from '../shell/shell';
import { go, memberById, openTask, pColor, projectById, searchAll, set, setUi, taskById, useStore, type SearchScope } from '../store';
import { Avatar, Dot, Empty, Highlight, ProjectIcon, ProjectStatusBadge, StatusIcon, Tag } from '../ui/helpers';
import { Icon } from '../ui/icon';
import { Eyebrow, LineTabs, Page, Panel, stretched } from './kit';

type Cat = Exclude<SearchScope, 'all'>;
const CATS: readonly [SearchScope, string][] = [
  ['all', 'All'],
  ['tasks', 'Tasks'],
  ['projects', 'Projects'],
  ['people', 'People'],
  ['files', 'Files'],
  ['comments', 'Comments'],
];
const row = 'relative flex min-h-9.5 items-center gap-2.5 px-3.5 transition-colors not-first:border-t not-first:border-divider hover:bg-muted';

export function SearchPage() {
  const ref = useRef<HTMLInputElement>(null);
  const d = useStore(s => s.data);
  const q = useStore(s => s.ui.searchQ);
  const cat = useStore(s => s.ui.searchCat);
  const r = searchAll(d, q);
  const total = Object.values(r).reduce((a, b) => a + b.length, 0);
  const setQ = (v: string) =>
    set(s => {
      s.ui.searchQ = v;
    });
  const pick = (v: string) => {
    setQ(v);
    ref.current?.focus();
  };
  const sec = (k: Cat, title: string, body: ReactNode) =>
    (cat === 'all' || cat === k) && r[k].length ? (
      <section className="mb-5.5" aria-label={title}>
        <Eyebrow className="mb-1.5">{`${title} · ${r[k].length}`}</Eyebrow>
        <Panel>{body}</Panel>
      </section>
    ) : null;
  return (
    <Page className="max-w-215">
      <h1 className="sr-only">Search</h1>
      <InputGroup className="mb-3.5 h-9 rounded-md">
        <InputGroupAddon className="pl-3 [&>svg]:size-4 [&>svg]:text-fg-4">
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          ref={ref}
          type="search"
          className="text-[15px]"
          placeholder="Search tasks, projects, people, files, and comments"
          aria-label="Search"
          value={q}
          onChange={e => setQ(e.currentTarget.value)}
        />
      </InputGroup>
      <LineTabs
        label="Result type"
        className="mb-4.5"
        value={cat}
        onChange={v => setUi('searchCat', v)}
        items={CATS.map(([k, n]) => ({ value: k, label: n, count: k === 'all' ? total : r[k].length }))}
      />
      {!q ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm text-muted-foreground">Recent:</span>
          {d.recentSearches.map(s => (
            <Tag key={s} tone="muted" className="hover:bg-muted-strong" render={<button onClick={() => pick(s)} />}>
              <History />
              {s}
            </Tag>
          ))}
        </div>
      ) : total ? (
        <>
          {sec(
            'tasks',
            'Tasks',
            r.tasks.map(t => {
              const p = projectById(d, t.project);
              return (
                <div key={t.id} className={row}>
                  <StatusIcon st={t.status} />
                  <span className="font-mono text-2xs text-muted-foreground">{t.key}</span>
                  <button className={cn(stretched, 'min-w-0 flex-1 truncate')} onClick={() => openTask(t.id)}>
                    <Highlight text={t.title} q={q} />
                  </button>
                  <span className="inline-flex max-w-35 items-center gap-1.25 text-xs text-fg-2 max-sm:hidden">
                    <Dot c={pColor(p)} />
                    <span className="truncate">{p?.name}</span>
                  </span>
                  <Avatar id={t.assignee} size="sm" className="relative z-10" />
                </div>
              );
            }),
          )}
          {sec(
            'projects',
            'Projects',
            r.projects.map(p => (
              <div key={p.id} className={row}>
                <ProjectIcon p={p} />
                <a {...linkTo({ r: 'project', id: p.id })} className={cn(stretched, 'min-w-0 flex-1 truncate')}>
                  <Highlight text={p.name} q={q} /> <span className="text-xs text-muted-foreground">{`— ${p.desc.slice(0, 70)}…`}</span>
                </a>
                <ProjectStatusBadge s={p.status} />
              </div>
            )),
          )}
          {sec(
            'people',
            'People',
            r.people.map(m => (
              <div key={m.id} className={row}>
                <Avatar id={m.id} size="md" tip={false} />
                <a {...linkTo({ r: 'member', id: m.id })} className={cn(stretched, 'min-w-0 flex-1 truncate')}>
                  <Highlight text={m.name} q={q} /> <span className="text-xs text-muted-foreground">{m.title}</span>
                </a>
                <span className="text-xs text-muted-foreground max-sm:hidden">{m.email}</span>
              </div>
            )),
          )}
          {sec(
            'files',
            'Files',
            r.files.map(f => (
              <div key={f.id} className={row}>
                <span className="grid size-6.5 shrink-0 place-items-center rounded-md bg-(--c)/16 text-tint" style={{ '--c': FT[f.type].c }}>
                  <Icon name={FT[f.type].i} className="size-3.5" />
                </span>
                <button className={cn(stretched, 'min-w-0 flex-1 truncate')} onClick={() => go({ r: 'project', id: f.project, tab: 'files' })}>
                  <Highlight text={f.name} q={q} />
                </button>
                <span className="text-xs text-muted-foreground">{`${f.size} · ${projectById(d, f.project)?.name}`}</span>
              </div>
            )),
          )}
          {sec(
            'comments',
            'Comments',
            r.comments.map(c => (
              <div key={c.id} className={cn(row, 'items-start py-2.5')}>
                <Avatar id={c.by} size="sm" className="relative z-10 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-fg-2">
                    <b className="font-medium text-foreground">{memberById(d, c.by)?.name}</b>
                    {` on ${taskById(d, c.task)?.title} · ${ago(c.at)}`}
                  </div>
                  <button className={cn(stretched, 'block text-base')} onClick={() => openTask(c.task)}>
                    <Highlight text={c.text} q={q} />
                  </button>
                </div>
              </div>
            )),
          )}
        </>
      ) : (
        <Panel>
          <Empty icon={SearchX} title="No results found" text={`Nothing matches “${q}”. Check the spelling or try a broader term.`}>
            <Button variant="outline" size="sm" onClick={() => pick('')}>
              Clear search
            </Button>
          </Empty>
        </Panel>
      )}
    </Page>
  );
}
