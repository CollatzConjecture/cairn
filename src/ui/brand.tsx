import { cn } from '@/lib/utils';
import type { Data } from '../domain/schema';

/* Cairn brand: two stacked slabs under a milestone diamond, the same diamond that marks milestones on the timeline, on a 32-unit
   grid. The lockup follows the theme's text colour; the app icon is the white mark on a black tile. */
const MARK = (
  <>
    <rect x="5" y="20.5" width="22" height="5" rx="1.6" />
    <rect x="8" y="14" width="16" height="4.5" rx="1.5" transform="rotate(-3 16 16.25)" />
    <rect x="13.6" y="6.1" width="5.2" height="5.2" rx="1" transform="rotate(45 16.2 8.7)" />
  </>
);

/** The lockup: the mark, then "cairn". `h` is the mark's height; the type is sized from it. */
export function Logo({ h = 22 }: { h?: number }) {
  return (
    <span
      role="img"
      aria-label="Cairn"
      className="inline-flex shrink-0 items-center gap-[0.3em] font-sans leading-none font-[620] tracking-[-0.04em] text-foreground"
      style={{ fontSize: h / 1.08 }}
    >
      <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" className="size-[1.08em] shrink-0">
        {MARK}
      </svg>
      <span aria-hidden="true" className="-translate-y-[0.04em]">
        cairn
      </span>
    </span>
  );
}
/** The app icon: the white mark at 74% of a black tile with 22% corners. */
export function Mark({ px = 22, className }: { px?: number; className?: string }) {
  return (
    <svg width={px} height={px} viewBox="0 0 32 32" aria-hidden="true" className={cn('block shrink-0', className)}>
      <rect width="32" height="32" rx="7.04" className="fill-black" />
      <g transform="translate(4.16 4.16) scale(.74)" className="fill-white">
        {MARK}
      </g>
    </svg>
  );
}
/** Workspace avatar: the app icon for the Cairn workspace, otherwise the first letter on the workspace colour. */
export function WsLogo({ w, px = 22 }: { w: Pick<Data['ws'], 'name' | 'c' | 'brand'>; px?: number }) {
  return w.brand ? (
    <Mark px={px} />
  ) : (
    <span
      className="grid shrink-0 place-items-center rounded-md bg-(--c) font-semibold text-white"
      style={{ '--c': w.c, width: px, height: px, fontSize: Math.max(9, Math.round(px * 0.46)) }}
    >
      {w.name[0]}
    </span>
  );
}
