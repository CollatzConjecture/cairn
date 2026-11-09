/* Loading placeholders, on the shadcn Skeleton. */
import { Skeleton as Sk } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Page } from '../pages/kit';
import { useRoute } from '../store';

/** Placeholder list rows. */
export function SkRows({ n = 8 }: { n?: number }) {
  return Array.from({ length: n }, (_, i) => (
    <div key={i} className="flex h-10 items-center gap-3 border-b border-divider px-2">
      <Sk className="size-3.75 rounded-sm" />
      <Sk className="h-2.5" style={{ width: 38 + ((i * 13) % 30) + '%' }} />
      <span className="flex-1" />
      <Sk className="h-4.5 w-17.5" />
      <Sk className="size-5.5 rounded-full" />
      <Sk className="h-2.5 w-13.5" />
    </div>
  ));
}
const card = 'flex flex-col gap-3 rounded-xl bg-card p-4 shadow-card';
function SkCards({ n = 6 }: { n?: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className={card}>
          <Sk className="size-7 rounded-md" />
          <Sk className="h-3 w-3/5" />
          <Sk className="h-2.25 w-[90%]" />
          <Sk className="h-2.25 w-[70%]" />
          <Sk className="h-1 w-full" />
        </div>
      ))}
    </div>
  );
}
function SkBoard() {
  return (
    <div className="flex gap-3 overflow-hidden px-(--gutter) pt-3">
      {[3, 4, 3, 2, 3].map((n, c) => (
        <div key={c} className="flex w-68 shrink-0 flex-col gap-2">
          <Sk className="my-2 h-2.75 w-20" />
          {Array.from({ length: n }, (_, i) => (
            <div key={i} className={cn(card, 'gap-2.5 p-card')}>
              <Sk className="h-3.5 w-2/5" />
              <Sk className="h-2.5" style={{ width: ((60 + i * 9) % 95) + '%' }} />
              <div className="flex items-center gap-2">
                <Sk className="h-2.25 w-10" />
                <Sk className="h-2.25 w-7.5" />
                <span className="flex-1" />
                <Sk className="size-4.5 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
/** The placeholder for the current page while `ui.loading` is set. */
export function Skeleton() {
  const r = useRoute();
  if (r?.r === 'project')
    return (
      <div className="flex h-full flex-col" aria-busy="true" aria-label="Loading">
        <div className="px-(--gutter) pt-6">
          <div className="mb-4 flex items-center gap-3">
            <Sk className="size-9 rounded-lg" />
            <Sk className="h-4.5 w-50" />
          </div>
          <div className="flex gap-4 pb-2.5">
            <Sk className="h-2.5 w-15" />
            <Sk className="h-2.5 w-12.5" />
            <Sk className="h-2.5 w-12.5" />
            <Sk className="h-2.5 w-15" />
          </div>
        </div>
        <div className="border-y px-(--gutter) py-2.5">
          <Sk className="h-5.5 w-50" />
        </div>
        {r.tab === 'board' ? (
          <SkBoard />
        ) : (
          <div className="px-5 py-3">
            <SkRows n={10} />
          </div>
        )}
      </div>
    );
  let body;
  if (r?.r === 'projects') body = <SkCards n={6} />;
  else if (r?.r === 'home' || r?.r === 'overview')
    body = (
      <>
        <div className="mb-4 grid grid-cols-4 rounded-xl border max-md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex flex-col gap-3 p-4 not-first:border-l">
              <Sk className="h-2.5 w-20" />
              <Sk className="h-5 w-11" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 max-[1100px]:grid-cols-1">
          <div className="rounded-xl border p-3.5">
            <SkRows n={6} />
          </div>
          <div className="rounded-xl border p-3.5">
            <SkRows n={6} />
          </div>
        </div>
      </>
    );
  else body = <SkRows n={10} />;
  return (
    <Page aria-busy="true" aria-label="Loading">
      <div className="mb-5 flex flex-col gap-2">
        <Sk className="h-5 w-55" />
        <Sk className="h-2.75 w-80" />
      </div>
      {body}
    </Page>
  );
}
