import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { CircleCheckIcon, InfoIcon, TriangleExclamationPointIcon, CircleExclamationPointIcon, Loader2Icon } from 'lucide-react';
import { effectiveDark, useStore } from '@/store';

// Cairn: the theme comes from the store (no next-themes), and toasts are inverted (foreground on background).
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
          '--normal-bg': 'var(--foreground)',
          '--normal-text': 'var(--background)',
          '--normal-border': 'transparent',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast text-sm! shadow-md! gap-2.5!',
          actionButton: 'bg-transparent! text-background! font-semibold! hover:bg-background/15!',
          closeButton: 'bg-foreground! text-background! border-background/20!',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
