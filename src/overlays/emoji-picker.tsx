import { useState, type ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { CommentId } from '../domain/ids';
import { mutate } from '../store';

export const EMOJI = ['👍', '🎉', '❤️', '👀', '🚀', '✅'] as const;

/** Toggles my reaction `e` on a comment. */
export function react(id: CommentId, e: string) {
  mutate(s => {
    const c = s.data.comments.find(x => x.id === id);
    if (!c) return;
    const l = c.re[e] ?? [];
    c.re[e] = l.includes(s.data.me) ? l.filter(x => x !== s.data.me) : [...l, s.data.me];
  });
}

/** The comment reaction picker: six emoji around the trigger `children`. Picking one closes it. */
export function EmojiPicker({ id, children }: { id: CommentId; children: ReactElement }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={children} />
      <PopoverContent align="start" className="w-auto flex-row gap-0.5 p-1">
        {EMOJI.map(e => (
          <Button
            key={e}
            variant="ghost"
            size="icon"
            className="text-lg"
            aria-label={`React ${e}`}
            onClick={() => {
              react(id, e);
              setOpen(false);
            }}
          >
            {e}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
