import { cn } from '@/lib/utils';
import type { Data } from '../domain/schema';

/* Cairn brand: three stacked stones on a 32-unit grid. The lockup follows the theme's text colour; the app icon is the white mark on a
   black tile. */
const STONES = (
  <>
    <path d="M4.6 25.2c0-3.1 4.9-5.4 11.6-5.4s11.2 2.1 11.2 5c0 2.4-4.6 3.9-11.4 3.9S4.6 27.5 4.6 25.2Z" />
    <path transform="rotate(-4 15.6 15.7)" d="M7.4 16.6c0-2.6 3.3-4.5 7.9-4.5 4.4 0 7.4 1.6 7.4 3.9 0 2.1-3.2 3.1-7.6 3.1-4.7 0-7.7-.6-7.7-2.5Z" />
    <path transform="rotate(7 17 8.4)" d="M12.6 8.9c0-1.9 2-3.4 4.6-3.4 2.4 0 4 1.2 4 2.9 0 1.5-1.7 2.4-4.2 2.4-2.6 0-4.4-.5-4.4-1.9Z" />
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
        {STONES}
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
        {STONES}
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
