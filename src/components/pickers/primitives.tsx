/* The two picker shapes every field picker is built from. Each owns its open state next to its trigger (`children`, rendered through
   Base UI's `render`), so it anchors there, scales from it, and returns focus to it on close. */
import { useState, type ReactElement, type ReactNode } from 'react';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/** One choice in a picker. `kbd` is a single key that picks it while the menu is open (status: 1 to 5). */
export type PickOption<V extends string> = { value: V; label: string; icon?: ReactNode; kbd?: string };

/** Radio items for a fixed list, for a picker or a submenu of a context menu. Picking closes the menu. */
export function PickerRadioItems<V extends string>({
  value,
  onChange,
  options,
}: {
  value: V | null;
  onChange: (v: V) => void;
  options: readonly PickOption<V>[];
}) {
  return (
    <DropdownMenuRadioGroup value={value} onValueChange={v => onChange(v as V)}>
      {options.map(o => (
        <DropdownMenuRadioItem key={o.value} value={o.value} closeOnClick>
          {o.icon}
          <span className="truncate">{o.label}</span>
          {o.kbd && <DropdownMenuShortcut className="mr-5">{o.kbd}</DropdownMenuShortcut>}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}

/** A single choice from a short fixed list (status, priority, estimate, repeat): a dropdown menu of radio items. */
export function MenuPicker<V extends string>({
  value,
  onChange,
  options,
  label,
  children,
  className,
}: {
  value: V | null;
  onChange: (v: V) => void;
  options: readonly PickOption<V>[];
  /** An uppercase heading above the options. */
  label?: string;
  children: ReactElement;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const pick = (v: V) => {
    onChange(v);
    setOpen(false);
  };
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger render={children} />
      <DropdownMenuContent
        className={cn('w-auto max-w-80', className)}
        onKeyDown={e => {
          const o = options.find(x => x.kbd === e.key);
          if (o && !e.metaKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            pick(o.value);
          }
        }}
      >
        <DropdownMenuGroup>
          {label && <DropdownMenuLabel>{label}</DropdownMenuLabel>}
          <PickerRadioItems value={value} onChange={pick} options={options} />
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** A searchable choice (assignee, project), or with `multiple` a set of choices that stays open while toggling (labels, dependencies). */
export function ComboPicker<V extends string>({
  value,
  onPick,
  options,
  placeholder,
  multiple = false,
  children,
  className,
}: {
  /** The chosen value, or every chosen value when `multiple`. */
  value: V | null | readonly V[];
  /** Called with the picked option; a `multiple` picker toggles it. */
  onPick: (v: V) => void;
  options: readonly PickOption<V>[];
  placeholder: string;
  multiple?: boolean;
  children: ReactElement;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const on = (v: V) => (Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={children} />
      <PopoverContent align="start" className={cn('w-60 gap-0 p-1', className)}>
        <Command className="rounded-none! p-0">
          <CommandInput placeholder={placeholder} aria-label={placeholder} />
          <CommandList className="max-h-80">
            <CommandEmpty className="py-2 text-left text-muted-foreground">No matches</CommandEmpty>
            {options.map(o => (
              <CommandItem
                key={o.value}
                value={`${o.label} ${o.value}`}
                data-checked={on(o.value)}
                onSelect={() => {
                  onPick(o.value);
                  if (!multiple) setOpen(false);
                }}
              >
                {o.icon}
                <span className="truncate">{o.label}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
