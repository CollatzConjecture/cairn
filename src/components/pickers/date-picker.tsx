import { useState, type ReactElement } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { MONL, TODAY, WD, addD, dOff, diffD, fmtDate, iso, parse, startOfWeek } from '../../domain/date';
import { useStore } from '../../store';

const QUICK = [
  ['Today', 0],
  ['Tomorrow', 1],
  ['Next week', 7 - ((TODAY.getDay() + 6) % 7)],
  ['In 2 weeks', 14],
] as const;

/** A date (`yyyy-mm-dd`) from quick picks or a month grid; `onChange(null)` clears it. Picking closes the popover. */
export function DatePicker({ value, onChange, children }: { value: string | null; onChange: (v: string | null) => void; children: ReactElement }) {
  const [open, setOpen] = useState(false);
  const pick = (v: string | null) => {
    onChange(v);
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={children} />
      <PopoverContent align="start" className="w-66 gap-0 p-1">
        <div className="flex flex-wrap gap-1 p-1">
          {QUICK.map(([n, d]) => (
            <Button key={n} variant="outline" size="xs" className="shadow-none" onClick={() => pick(dOff(d))}>
              {n}
            </Button>
          ))}
          {value && (
            <Button variant="outline" size="xs" className="text-red shadow-none" onClick={() => pick(null)}>
              Clear
            </Button>
          )}
        </div>
        <Separator className="-mx-1 my-1 w-auto bg-divider" />
        {/* The popup unmounts when closed, so each opening starts on the selected month. */}
        <MonthGrid value={value} onPick={pick} />
      </PopoverContent>
    </Popover>
  );
}

function MonthGrid({ value, onPick }: { value: string | null; onPick: (v: string) => void }) {
  const weekStart = useStore(s => s.prefs.weekStart);
  const [m, setM] = useState(() => {
    const d = parse(value) ?? TODAY;
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const cells = Array.from({ length: 42 }, (_, i) => addD(startOfWeek(m, weekStart), i));
  const shift = (n: number) => setM(new Date(m.getFullYear(), m.getMonth() + n, 1));
  return (
    <div className="w-63 px-1.5 pt-1.5 pb-0.5">
      <div className="mb-1.5 flex items-center">
        <b className="grow pl-1 text-[13px] font-semibold">{`${MONL[m.getMonth()]} ${m.getFullYear()}`}</b>
        <Button variant="ghost" size="icon-xs" onClick={() => shift(-1)} aria-label="Previous month">
          <ChevronLeft />
        </Button>
        <Button variant="ghost" size="icon-xs" onClick={() => shift(1)} aria-label="Next month">
          <ChevronRight />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-2xs" role="grid" aria-label={`${MONL[m.getMonth()]} ${m.getFullYear()}`}>
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className="py-0.75 text-muted-foreground">
            {WD[(i + weekStart) % 7]?.slice(0, 2)}
          </span>
        ))}
        {cells.map(d => {
          const ds = iso(d);
          const on = ds === value;
          return (
            <button
              key={ds}
              type="button"
              onClick={() => onPick(ds)}
              aria-label={fmtDate(ds, true)}
              aria-pressed={on}
              className={cn(
                'h-7.5 rounded-md text-xs tabular-nums transition-colors hover:bg-muted active:scale-[0.97]',
                on
                  ? 'bg-primary font-semibold text-primary-foreground hover:bg-primary'
                  : diffD(d, TODAY) === 0
                    ? 'font-semibold text-primary ring-1 ring-primary-line ring-inset'
                    : d.getMonth() !== m.getMonth() && 'text-muted-foreground',
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
