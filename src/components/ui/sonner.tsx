import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { CircleCheckIcon, InfoIcon, TriangleExclamationPointIcon, CircleExclamationPointIcon, Loader2Icon } from 'lucide-react';
import { effectiveDark, useStore } from '@/store';

// Cairn: the theme comes from the store (no next-themes). Light mode inverts toasts (dark on the light page); dark mode raises them like a menu.
const Toaster = ({ ...props }: ToasterProps) => {
  const dark = useStore(s => effectiveDark(s.prefs));

  return (
    <Sonner
      theme={dark ? 'dark' : 'light'}
      className="toaster group"
      position="bottom-right"
      offset={20}
      closeButton
      icons={{
        success: <CircleCheckIcon className="size-4 text-green" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleExclamationPointIcon className="size-4 text-amber" />,
        error: <CircleExclamationPointIcon className="size-4 text-red" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': dark ? 'var(--popover)' : 'var(--foreground)',
          '--normal-text': dark ? 'var(--foreground)' : 'var(--background)',
          '--normal-border': dark ? 'var(--border)' : 'transparent',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast text-sm! shadow-md! gap-2.5!',
          actionButton: dark
            ? 'bg-transparent! text-foreground! font-semibold! hover:bg-foreground/10!'
            : 'bg-transparent! text-background! font-semibold! hover:bg-background/15!',
          closeButton: dark ? 'bg-popover! text-foreground! border-border!' : 'bg-foreground! text-background! border-background/20!',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
