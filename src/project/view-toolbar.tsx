/* The view toolbar: search, the filter builder, sort, group and column menus,
   and the active filter chips. Every setting is the view's (`useView(viewKey)`), so it persists per page. */
import { useState, type ReactElement, type ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  ChevronDown,
  CircleDot,
  Columns3,
  Folder,
  ListFilter,
  Minus,
  Plus,
  RotateCcw,
  Rows3,
  Search,
  SignalHigh,
  Trash,
  User,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { FIELDS, GROUP_NAMES, SORT_NAMES, fieldOptions } from '../components/view-engine';
import { TCOLS } from '../domain/constants';
import { FilterFieldSchema, GroupBySchema, SortFieldSchema, type Filter, type FilterField, type GroupBy, type SortField } from '../domain/schema';
import { clearFilters, rmFilter, updateView, useStore, useView, type ViewKey } from '../store';
import { Icon } from '../ui/icon';

type Trigger = { children: ReactElement };

const SORTS: readonly [SortField, string][] = [
  ['manual', 'Manual'],
  ['priority', 'Priority'],
  ['due', 'Due date'],
  ['start', 'Start date'],
  ['title', 'Title'],
  ['status', 'Status'],
  ['assignee', 'Assignee'],
  ['created', 'Created'],
  ['updated', 'Last updated'],
];
const GROUPS: readonly [GroupBy, string, LucideIcon][] = [
  ['status', 'Status', CircleDot],
  ['priority', 'Priority', SignalHigh],
  ['assignee', 'Assignee', User],
  ['project', 'Project', Folder],
  ['due', 'Due date', Calendar],
  ['none', 'No grouping', Minus],
];
const FIELD_KEYS = FilterFieldSchema.options;
const FIELD_ITEMS = FIELD_KEYS.map(f => ({ value: f, label: FIELDS[f].name }));
const OP_ITEMS = [
  { value: 'is', label: 'is' },
  { value: 'not', label: 'is not' },
] as const;

function SortMenu({ viewKey, children }: Trigger & { viewKey: ViewKey }) {
  const v = useView(viewKey);
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger render={children} />
      <DropdownMenuContent className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={v.sort.f}
            onValueChange={f => {
              const r = SortFieldSchema.safeParse(f);
              if (!r.success) return;
              updateView(viewKey, x => {
                x.sort = { f: r.data, dir: x.sort.dir };
              });
              setOpen(false);
            }}
          >
            {SORTS.map(([k, n]) => (
              <DropdownMenuRadioItem key={k} value={k}>
                {n}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <div className="px-1.5 pt-0.5 pb-1">
          <ToggleGroup
            spacing={0.5}
            value={[String(v.sort.dir)]}
            onValueChange={x =>
              x[0] &&
              updateView(viewKey, w => {
                w.sort.dir = x[0] === '-1' ? -1 : 1;
              })
            }
            aria-label="Sort direction"
            className="w-full"
          >
            <ToggleGroupItem value="1" size="sm" className="flex-1 gap-1.25">
              <ArrowUp className="size-3" />
              Ascending
            </ToggleGroupItem>
            <ToggleGroupItem value="-1" size="sm" className="flex-1 gap-1.25">
              <ArrowDown className="size-3" />
              Descending
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GroupMenu({ viewKey, children }: Trigger & { viewKey: ViewKey }) {
  const v = useView(viewKey);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={children} />
      <DropdownMenuContent className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Group by</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={v.group}
            onValueChange={g => {
              const r = GroupBySchema.safeParse(g);
              if (r.success)
                updateView(viewKey, x => {
                  x.group = r.data;
                });
            }}
          >
            {GROUPS.map(([k, n, I]) => (
              <DropdownMenuRadioItem key={k} value={k} closeOnClick>
                <I />
                {n}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Project views list only their own project's tasks, so their table never offers a Project column. */
export const scoped = (key: ViewKey) => key.startsWith('p:') || key.startsWith('sv:');

function ColumnsMenu({ viewKey, children }: Trigger & { viewKey: ViewKey }) {
  const v = useView(viewKey);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={children} />
      <DropdownMenuContent className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
          {TCOLS.filter(c => c[0] !== 'title' && !(c[0] === 'project' && scoped(viewKey))).map(([k, n]) => (
            <DropdownMenuCheckboxItem
              key={k}
              checked={!v.hidden.includes(k)}
              onCheckedChange={on =>
                updateView(viewKey, x => {
                  x.hidden = on ? x.hidden.filter(h => h !== k) : [...x.hidden, k];
                })
              }
            >
              {n}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            updateView(viewKey, x => {
              x.colW = {};
            })
          }
        >
          <RotateCcw />
          Reset widths
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The value names a filter shows: up to two names, else a count. */
function useFilterLabel(f: Filter) {
  const d = useStore(s => s.data);
  const opts = fieldOptions(d, f.f);
  const names = f.v.map(id => opts.find(o => o.id === id)?.name ?? id);
  return names;
}

const valRow = 'flex min-h-7 cursor-pointer items-center gap-2.25 rounded-md px-2 text-base hover:bg-muted [&_svg]:size-3.75 [&_svg]:shrink-0';

function FilterRow({ viewKey, f, i, open, onEdit }: { viewKey: ViewKey; f: Filter; i: number; open: boolean; onEdit: () => void }) {
  const d = useStore(s => s.data);
  const names = useFilterLabel(f);
  const setF = (fn: (x: Filter) => void) =>
    updateView(viewKey, v => {
      const x = v.filters[i];
      if (x) fn(x);
    });
  return (
    <>
      <div className="grid grid-cols-[44px_120px_84px_minmax(0,1fr)_26px] items-center gap-1.5 max-sm:grid-cols-2">
        <span className="pr-1 text-right text-xs text-muted-foreground max-sm:hidden">{i ? 'and' : 'Where'}</span>
        <Select
          items={FIELD_ITEMS}
          value={f.f}
          onValueChange={v => {
            const r = FilterFieldSchema.safeParse(v);
            if (!r.success) return;
            setF(x => {
              x.f = r.data;
              x.v = [];
            });
          }}
        >
          <SelectTrigger size="sm" className="w-full text-sm" aria-label="Field">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FIELD_ITEMS.map(o => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={OP_ITEMS}
          value={f.op}
          onValueChange={v =>
            setF(x => {
              x.op = v === 'not' ? 'not' : 'is';
            })
          }
        >
          <SelectTrigger size="sm" className="w-full text-sm" aria-label="Operator">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OP_ITEMS.map(o => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          className="flex h-6.5 min-w-0 items-center gap-1.5 rounded-md border border-input px-2 text-left text-sm transition-colors hover:bg-muted"
          onClick={onEdit}
          aria-expanded={open}
          aria-label={`${FIELDS[f.f].name} values`}
        >
          <span className={cn('min-w-0 flex-1 truncate', !names.length && 'text-muted-foreground')}>{names.length ? names.join(', ') : 'Select…'}</span>
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        </button>
        <Button variant="ghost" size="icon-xs" onClick={() => rmFilter(viewKey, i)} aria-label="Remove filter">
          <Trash />
        </Button>
      </div>
      {open && (
        <div className="ml-12.5 max-h-50 overflow-auto rounded-lg border p-1 max-sm:ml-0" role="group" aria-label={`${FIELDS[f.f].name} values`}>
          {fieldOptions(d, f.f).map(o => (
            <label key={o.id} className={valRow}>
              <Checkbox
                checked={f.v.includes(o.id)}
                onCheckedChange={on =>
                  setF(x => {
                    x.v = on ? [...x.v, o.id] : x.v.filter(y => y !== o.id);
                  })
                }
              />
              {o.icon}
              <span className="truncate">{o.name}</span>
            </label>
          ))}
        </div>
      )}
    </>
  );
}

/** The filter builder: one row per filter (field, operator, values), and badges that add a filter on each field. */
function FilterBuilder({ viewKey, children }: Trigger & { viewKey: ViewKey }) {
  const v = useView(viewKey);
  const [edit, setEdit] = useState<number | null>(null);
  const add = (f: FilterField) => {
    updateView(viewKey, x => {
      x.filters.push({ f, op: 'is', v: [] });
    });
    setEdit(v.filters.length);
  };
  return (
    <Popover onOpenChange={o => !o && setEdit(null)}>
      <PopoverTrigger render={children} />
      <PopoverContent align="start" className="w-auto max-w-140 min-w-110 gap-0 p-1 max-sm:min-w-0">
        <div className="flex min-h-7.5 items-center justify-between px-2 py-1 text-2xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">
          Filter by
          {v.filters.length > 0 && (
            <Button variant="ghost" size="sm" className="-mr-1 tracking-normal normal-case" onClick={() => clearFilters(viewKey)}>
              Clear all
            </Button>
          )}
        </div>
        {v.filters.length ? (
          <div className="flex flex-col gap-1.5 px-2 pt-0.5 pb-1.5">
            {v.filters.map((f, i) => (
              <FilterRow key={i} viewKey={viewKey} f={f} i={i} open={edit === i} onEdit={() => setEdit(edit === i ? null : i)} />
            ))}
          </div>
        ) : (
          <p className="px-2 pt-0.5 pb-2 text-sm text-muted-foreground">
            No filters applied. Combine filters to narrow the task list, e.g. Status is In Progress and Assignee is Sarah.
          </p>
        )}
        <div className="-mx-1 my-1 h-px bg-border" />
        <div className="flex flex-wrap items-center gap-1 px-2 pt-1 pb-1.5 text-xs">
          <span className="mr-1 text-muted-foreground">Add filter:</span>
          {FIELD_KEYS.map(k => (
            <Badge key={k} variant="outline" render={<button onClick={() => add(k)} />} className="cursor-pointer gap-1 hover:bg-muted [&>svg]:size-2.75!">
              <Icon name={FIELDS[k].icon} />
              {FIELDS[k].name}
            </Badge>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** A filter chip's values, toggled in place. */
function FilterValues({ viewKey, f, i, children }: Trigger & { viewKey: ViewKey; f: Filter; i: number }) {
  const d = useStore(s => s.data);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={children} />
      <DropdownMenuContent className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{`${FIELDS[f.f].name} ${f.op === 'not' ? 'is not' : 'is'}`}</DropdownMenuLabel>
          {fieldOptions(d, f.f).map(o => (
            <DropdownMenuCheckboxItem
              key={o.id}
              checked={f.v.includes(o.id)}
              closeOnClick={false}
              onCheckedChange={on =>
                updateView(viewKey, v => {
                  const x = v.filters[i];
                  if (x) x.v = on ? [...x.v, o.id] : x.v.filter(y => y !== o.id);
                })
              }
            >
              {o.icon}
              {o.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterChip({ viewKey, f, i }: { viewKey: ViewKey; f: Filter; i: number }) {
  const names = useFilterLabel(f);
  const val = names.length ? (names.length > 2 ? `${names.length} selected` : names.join(', ')) : 'any';
  return (
    <span className="inline-flex h-6.5 items-center gap-1.5 rounded-md border border-primary-line bg-primary-soft pr-1 pl-2 text-xs text-foreground">
      <FilterValues viewKey={viewKey} f={f} i={i}>
        <button className="inline-flex items-center gap-1.25 [&_svg]:size-3">
          <Icon name={FIELDS[f.f].icon} />
          <span>
            <b className="font-medium text-fg-2">{FIELDS[f.f].name}</b>
            {` ${f.op === 'not' ? 'is not' : 'is'} ${val}`}
          </span>
        </button>
      </FilterValues>
      <Button variant="ghost" size="icon-xs" className="size-4.5 text-fg-2" onClick={() => rmFilter(viewKey, i)} aria-label="Remove filter">
        <X />
      </Button>
    </span>
  );
}

/** The active filters under the toolbar. */
function FilterChips({ viewKey }: { viewKey: ViewKey }) {
  const v = useView(viewKey);
  if (!v.filters.length) return null;
  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-1.5 border-b px-(--gutter) py-2 text-xs text-muted-foreground"
      aria-label="Active filters"
      role="group"
    >
      <ListFilter className="size-3.25" />
      {v.filters.map((f, i) => (
        <span key={i} className="contents">
          {i > 0 && <span>and</span>}
          <FilterChip viewKey={viewKey} f={f} i={i} />
        </span>
      ))}
      <FilterBuilder viewKey={viewKey}>
        <Button variant="ghost" size="sm">
          <Plus className="size-3" />
          Add
        </Button>
      </FilterBuilder>
      <span className="flex-1" />
      <Button variant="ghost" size="sm" onClick={() => clearFilters(viewKey)}>
        Clear all
      </Button>
    </div>
  );
}

const tool = 'h-6.5 gap-1.5 px-2 text-xs [&_svg]:size-3.5';

/** `group` and `cols` show those menus; `extra` sits after them and `right` at the far end. */
export function ViewToolbar({
  viewKey,
  group = true,
  cols = false,
  extra,
  right,
}: {
  viewKey: ViewKey;
  group?: boolean;
  cols?: boolean;
  extra?: ReactNode;
  right?: ReactNode;
}) {
  const v = useView(viewKey);
  const nf = v.filters.length;
  return (
    <>
      <div role="toolbar" aria-label="View options" className="flex min-h-11 shrink-0 flex-wrap items-center gap-1 border-b px-(--gutter) py-2">
        <InputGroup className="h-6.5 w-50 rounded-md">
          <InputGroupAddon className="pl-2 [&>svg]:size-3.25 [&>svg]:text-fg-4">
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            className="h-full pl-1 text-sm"
            placeholder="Search tasks"
            aria-label="Search tasks"
            value={v.q}
            onChange={e => {
              const q = e.currentTarget.value;
              updateView(viewKey, x => {
                x.q = q;
              });
            }}
          />
        </InputGroup>
        <FilterBuilder viewKey={viewKey}>
          <Button variant="ghost" className={cn(tool, nf && 'bg-muted text-foreground')}>
            <ListFilter />
            Filter
            {nf > 0 && <Badge className="h-4 bg-primary-soft px-1.25 text-2xs text-primary">{nf}</Badge>}
          </Button>
        </FilterBuilder>
        <SortMenu viewKey={viewKey}>
          <Button variant="ghost" className={tool}>
            <ArrowUpDown />
            <span className="max-sm:hidden">Sort:</span>
            {SORT_NAMES[v.sort.f]}
          </Button>
        </SortMenu>
        {group && (
          <GroupMenu viewKey={viewKey}>
            <Button variant="ghost" className={tool}>
              <Rows3 />
              <span className="max-sm:hidden">Group:</span>
              {GROUP_NAMES[v.group]}
            </Button>
          </GroupMenu>
        )}
        {cols && (
          <ColumnsMenu viewKey={viewKey}>
            <Button variant="ghost" className={tool}>
              <Columns3 />
              Columns
            </Button>
          </ColumnsMenu>
        )}
        {extra}
        <span className="flex-1" />
        {right}
      </div>
      <FilterChips viewKey={viewKey} />
    </>
  );
}
