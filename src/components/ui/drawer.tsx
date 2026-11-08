import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer';
import { cn } from 'cn';

/*
 * Cairn: an edge sheet you can swipe away, on Base UI's Drawer. While the finger is down the popup follows it 1:1
 * (--drawer-swipe-movement-x, with transitions off under data-swiping). On release it finishes on the iOS sheet curve,
 * sooner after a fast flick (--drawer-swipe-strength), and the backdrop fades with the same swipe progress, so the two
 * never drift apart. It enters from, and leaves toward, the edge it is attached to.
 */
function Drawer(props: DrawerPrimitive.Root.Props) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />;
}

const release = 'duration-[calc(360ms*var(--drawer-swipe-strength,1))] ease-drawer data-swiping:duration-0';

function DrawerContent({
  className,
  children,
  side = 'right',
  overlay = true,
  ...props
}: DrawerPrimitive.Popup.Props & { side?: 'left' | 'right'; overlay?: boolean }) {
  return (
    <DrawerPrimitive.Portal>
      {overlay && (
        <DrawerPrimitive.Backdrop
          data-slot="drawer-overlay"
          className={cn(
            'fixed inset-0 z-50 bg-overlay opacity-[calc(1-var(--drawer-swipe-progress,0))] transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0',
            release,
          )}
        />
      )}
      <DrawerPrimitive.Viewport className="pointer-events-none fixed inset-0 z-50">
        <DrawerPrimitive.Popup
          data-slot="drawer-content"
          data-side={side}
          className={cn(
            'pointer-events-auto fixed inset-y-0 flex flex-col bg-popover text-base text-popover-foreground shadow-lg outline-none',
            'translate-x-(--drawer-swipe-movement-x) transition-transform',
            side === 'right'
              ? 'right-0 border-l data-ending-style:translate-x-full data-starting-style:translate-x-full'
              : 'left-0 border-r data-ending-style:-translate-x-full data-starting-style:-translate-x-full',
            release,
            className,
          )}
          {...props}
        >
          {children}
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  );
}

function DrawerTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return <DrawerPrimitive.Title data-slot="drawer-title" className={cn('text-base font-medium text-foreground', className)} {...props} />;
}

function DrawerDescription({ className, ...props }: DrawerPrimitive.Description.Props) {
  return <DrawerPrimitive.Description data-slot="drawer-description" className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

export { Drawer, DrawerContent, DrawerTitle, DrawerDescription };
