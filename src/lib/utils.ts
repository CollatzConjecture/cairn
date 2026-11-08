export { cn } from 'cn';

/** The app's reduced-motion setting for motion driven from JS: Settings > Appearance can force it, otherwise it follows the OS. */
export const reducedMotion = () => {
  const m = document.documentElement.dataset.motion;
  return m === 'reduce' || (m !== 'full' && matchMedia('(prefers-reduced-motion: reduce)').matches);
};
