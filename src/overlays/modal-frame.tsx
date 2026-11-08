/* The modal frame on shadcn's DialogContent: header with title and close, a scrolling body, a footer. */
import type { ReactNode, RefObject } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const WIDTH = { sm: 'sm:max-w-105', md: 'sm:max-w-140', lg: 'sm:max-w-180' } as const;

/** Where every modal sits: 10vh from the top on desktop, a bottom sheet on phones. */
export const modalPlace = (size: keyof typeof WIDTH) =>
  cn(
    'top-[10vh] max-h-[80vh] translate-y-0',
    WIDTH[size],
    'max-sm:top-auto max-sm:bottom-0 max-sm:max-h-[92vh] max-sm:max-w-full max-sm:rounded-t-[14px] max-sm:rounded-b-none',
  );

export function ModalFrame({
  size = 'md',
  title,
  sub,
  children,
  footer,
  onSubmit,
  initialFocus,
  bodyClassName,
}: {
  size?: keyof typeof WIDTH;
  title: ReactNode;
  sub?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Makes the body and footer a form: Enter in a field and Mod+Enter anywhere submit it. */
  onSubmit?: () => void;
  initialFocus?: RefObject<HTMLElement | null>;
  bodyClassName?: string;
}) {
  const inner = (
    <>
      <div className={cn('flex min-h-0 flex-col gap-3.5 overflow-y-auto px-4 py-3.5', bodyClassName)}>{children}</div>
      {footer && <div className="flex items-center gap-2 border-t px-4 py-3">{footer}</div>}
    </>
  );
  return (
    <DialogContent showCloseButton={false} initialFocus={initialFocus} className={cn('flex flex-col gap-0 overflow-hidden p-0', modalPlace(size))}>
      <div className="flex items-start gap-2 px-4 pt-3.5">
        <div className="min-w-0 flex-1">
          <DialogTitle className="text-md leading-snug font-semibold">{title}</DialogTitle>
          {sub && <DialogDescription className="mt-0.5 text-sm text-fg-2">{sub}</DialogDescription>}
        </div>
        <DialogClose render={<Button variant="ghost" size="icon-sm" className="-mt-0.5 -mr-1" aria-label="Close" />}>
          <X className="size-4" />
        </DialogClose>
      </div>
      {onSubmit ? (
        <form
          className="flex min-h-0 flex-col"
          noValidate
          onSubmit={e => {
            e.preventDefault();
            onSubmit();
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              e.currentTarget.requestSubmit();
            }
          }}
        >
          {inner}
        </form>
      ) : (
        inner
      )}
    </DialogContent>
  );
}
