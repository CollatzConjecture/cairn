import { cn } from '@/lib/utils';

const LEVELS = [
  ['Too short', 'red'],
  ['Weak', 'red'],
  ['Fair', 'amber'],
  ['Good', 'green'],
  ['Strong', 'green'],
] as const;
const TONE = { red: ['bg-red', 'text-red'], amber: ['bg-amber', 'text-amber'], green: ['bg-green', 'text-green'] } as const;

/** Password strength score, 0 to 4: one point each for 8+ chars, 12+ chars, letters with digits, a symbol. */
export function strength(pw: string) {
  return (pw.length >= 8 ? 1 : 0) + (pw.length >= 12 ? 1 : 0) + (/[0-9]/.test(pw) && /[a-zA-Z]/.test(pw) ? 1 : 0) + (/[^a-zA-Z0-9]/.test(pw) ? 1 : 0);
}
/** The new-password meter (settings, sign up, reset): four bars and a word. Nothing while the field is empty. */
export function StrengthMeter({ pw }: { pw: string }) {
  if (!pw) return null;
  const s = strength(pw);
  const [name, tone] = LEVELS[s] ?? LEVELS[0];
  const [bar, text] = TONE[tone];
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-1" aria-hidden="true">
        {[0, 1, 2, 3].map(i => (
          <i key={i} className={cn('h-1 flex-1 rounded-full bg-muted-strong transition-colors', i < s && bar)} />
        ))}
      </div>
      <span className={cn('w-15 text-right text-xs', text)} aria-live="polite">
        <span className="sr-only">Password strength: </span>
        {name}
      </span>
    </div>
  );
}
