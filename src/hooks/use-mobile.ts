import * as React from 'react';

// Cairn: the sidebar becomes a sheet below 900px (Tailwind's `md` in src/index.css).
const MOBILE_BREAKPOINT = 900;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(() => window.innerWidth < MOBILE_BREAKPOINT);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

const coarse = () => window.matchMedia('(pointer: coarse)');
/** True on touch-first devices (phones, tablets), where panels close with a swipe. Mouse users keep the click-only sheets. */
export function useCoarsePointer() {
  return React.useSyncExternalStore(
    onChange => {
      const mql = coarse();
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => coarse().matches,
  );
}
