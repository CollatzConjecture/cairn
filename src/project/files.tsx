/* The project Files tab: search, type and sort filters, grid or list, uploads with progress, and a dropzone. */
import { useState } from 'react';
import { Ellipsis, FolderOpen, LayoutGrid, Link, List, Search, SearchX, Upload, CloudUpload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { FT, fileType, type FileType } from '../domain/constants';
import { ago } from '../domain/date';
import type { ProjectId } from '../domain/ids';
import type { FileItem } from '../domain/schema';
import { memberById, openTask, previewFile, set, setUi, taskById, uploadFiles, useStore, type Ui } from '../store';
import { Avatar, Empty, FilePreview } from '../ui/helpers';
import { Icon } from '../ui/icon';
import { FileContextMenu, FileMenu } from './menus';

const TYPES = ['fig', 'pdf', 'zip', 'img', 'sheet', 'doc', 'code'] as const satisfies readonly FileType[];
const TYPE_ITEMS = [{ value: 'all', label: 'All types' }, ...TYPES.map(k => ({ value: k, label: FT[k].n }))];
const SORT_ITEMS: { value: Ui['fileSort']; label: string }[] = [
  { value: 'date', label: 'Sort: Newest' },
  { value: 'name', label: 'Sort: Name' },
  { value: 'type', label: 'Sort: Type' },
];
const isSort = (v: unknown): v is Ui['fileSort'] => SORT_ITEMS.some(o => o.value === v);

/** A file type's glyph on a tint of its colour. */
const FileTypeIcon = ({ t }: { t: FileType }) => (
  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-(--c)/13 text-(--c) [&_svg]:size-3.5" style={{ '--c': FT[t].c }}>
    <Icon name={FT[t].i} />
  </span>
);

function FileCard({ f }: { f: FileItem }) {
  const by = useStore(s => memberById(s.data, f.by));
  return (
    <FileContextMenu id={f.id}>
      <div className="group/file relative overflow-hidden rounded-xl border bg-card transition-colors hover:border-input">
        <FilePreview f={f} className="aspect-[16/10] rounded-none border-b bg-sunken" />
        <div className="flex flex-col gap-0.5 px-2.5 py-2.25">
          <button
            className="truncate text-left text-sm font-medium outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-ring"
            onClick={() => previewFile(f.id)}
          >
            {f.name}
          </button>
          <span className="truncate text-2xs text-muted-foreground">{`${f.size} · ${by?.name.split(' ')[0] ?? ''} · ${ago(f.at)}`}</span>
        </div>
        <FileMenu id={f.id}>
          <Button
            variant="ghost"
            size="icon-xs"
            className="absolute top-1.5 right-1.5 z-10 bg-card opacity-0 ring-1 ring-border group-hover/file:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
            aria-label="File options"
          >
            <Ellipsis />
          </Button>
        </FileMenu>
      </div>
    </FileContextMenu>
  );
}

const th = 'h-8.5 px-2.5 text-left text-xs font-medium whitespace-nowrap text-fg-2';
const td = 'h-11 border-t border-divider px-2.5 text-sm';

function FileRow({ f }: { f: FileItem }) {
  const d = useStore(s => s.data);
  const t = taskById(d, f.task);
  const by = memberById(d, f.by);
  return (
    <FileContextMenu id={f.id}>
      <tr className="transition-colors hover:bg-muted">
        <td className={cn(td, 'pl-3.5')}>
          <span className="flex items-center gap-2">
            <FileTypeIcon t={f.type} />
            <button className="truncate text-left font-medium hover:underline" onClick={() => previewFile(f.id)}>
              {f.name}
            </button>
            {t && (
              <Badge variant="outline" render={<button onClick={() => openTask(t.id)} />} className="cursor-pointer gap-1 font-mono [&>svg]:size-2.5!">
                <Link />
                {t.key}
              </Badge>
            )}
          </span>
        </td>
        <td className={cn(td, 'text-fg-2')}>{FT[f.type].n}</td>
        <td className={cn(td, 'text-fg-2 tabular-nums')}>{f.size}</td>
        <td className={td}>
          <span className="flex items-center gap-2">
            <Avatar id={f.by} size="sm" tip={false} />
            {by?.name}
          </span>
        </td>
        <td className={cn(td, 'text-fg-2')}>{ago(f.at)}</td>
        <td className={cn(td, 'w-10 pr-2 text-right')}>
          <FileMenu id={f.id}>
            <Button variant="ghost" size="icon-sm" aria-label="File options">
              <Ellipsis />
            </Button>
          </FileMenu>
        </td>
      </tr>
    </FileContextMenu>
  );
}

function UploadInput({ pid }: { pid: ProjectId }) {
  return (
    <input
      type="file"
      multiple
      hidden
      aria-label="Upload files"
      onChange={e => {
        const files = e.currentTarget.files;
        if (files) uploadFiles(files, { project: pid, task: null });
        e.currentTarget.value = '';
      }}
    />
  );
}

export function FilesTab({ pid }: { pid: ProjectId }) {
  const d = useStore(s => s.data);
  const q = useStore(s => s.ui.fileQ);
  const ft = useStore(s => s.ui.fileType);
  const sort = useStore(s => s.ui.fileSort);
  const view = useStore(s => s.ui.fileView);
  const uploads = useStore(s => s.ui.uploads).filter(u => u.project === pid);
  const [over, setOver] = useState(false);
  const ql = q.toLowerCase();
  const fs = d.files
    .filter(f => f.project === pid && (!ql || f.name.toLowerCase().includes(ql)) && (ft === 'all' || f.type === ft))
    .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : sort === 'type' ? a.type.localeCompare(b.type) : b.at - a.at));
  const filtered = !!q || ft !== 'all';
  return (
    <>
      <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-1 border-b px-(--gutter) py-2">
        <InputGroup className="h-6.5 w-50 rounded-md">
          <InputGroupAddon className="pl-2 [&>svg]:size-3.25 [&>svg]:text-fg-4">
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            className="h-full pl-1 text-sm"
            placeholder="Search files"
            aria-label="Search files"
            value={q}
            onChange={e => {
              const v = e.currentTarget.value;
              set(s => {
                s.ui.fileQ = v;
              });
            }}
          />
        </InputGroup>
        <Select
          items={TYPE_ITEMS}
          value={ft}
          onValueChange={v =>
            set(s => {
              s.ui.fileType = v ?? 'all';
            })
          }
        >
          <SelectTrigger size="sm" className="ml-1 h-6.5 text-xs" aria-label="Filter by type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_ITEMS.map(o => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={SORT_ITEMS}
          value={sort}
          onValueChange={v =>
            isSort(v) &&
            set(s => {
              s.ui.fileSort = v;
            })
          }
        >
          <SelectTrigger size="sm" className="ml-1 h-6.5 text-xs" aria-label="Sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_ITEMS.map(o => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="flex-1" />
        <ToggleGroup
          spacing={0.5}
          value={[view]}
          onValueChange={v => setUi('fileView', v[0] === 'list' ? 'list' : 'grid')}
          aria-label="File layout"
          className="rounded-md bg-muted-strong p-0.5"
        >
          <ToggleGroupItem value="grid" size="sm" className="h-6 min-w-0 px-2.25 data-pressed:bg-background data-pressed:shadow-xs" aria-label="Grid view">
            <LayoutGrid className="size-3.25" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" size="sm" className="h-6 min-w-0 px-2.25 data-pressed:bg-background data-pressed:shadow-xs" aria-label="List view">
            <List className="size-3.25" />
          </ToggleGroupItem>
        </ToggleGroup>
        <Button size="sm" nativeButton={false} render={<label />} className="ml-1 cursor-pointer">
          <Upload className="size-3.25" />
          Upload
          <UploadInput pid={pid} />
        </Button>
      </div>
      <div className="w-full px-(--gutter) pt-4 pb-18 max-md:pb-24">
        <label
          className={cn(
            'mb-4 flex cursor-pointer items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-dashed border-input p-4.5 text-sm text-fg-2 transition-colors hover:border-primary-line hover:bg-primary-soft hover:text-foreground',
            over && 'border-primary-line bg-primary-soft text-foreground',
          )}
          onDragOver={e => {
            if (!e.dataTransfer.types.includes('Files')) return;
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={e => {
            if (!(e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget))) setOver(false);
          }}
          onDrop={e => {
            e.preventDefault();
            setOver(false);
            if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files, { project: pid, task: null });
          }}
        >
          <CloudUpload className="size-4.5" />
          <span>
            Drop files here or <span className="text-primary">browse</span> — up to 250 MB each
          </span>
          <UploadInput pid={pid} />
        </label>
        {uploads.length > 0 && (
          <div className="mb-4 flex flex-col gap-1.5" aria-label="Uploads">
            {uploads.map(u => (
              <div key={u.id} className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm">
                <FileTypeIcon t={fileType(u.name)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-medium">{u.name}</span>
                    <span className="text-2xs text-muted-foreground tabular-nums">{`${u.pct}%`}</span>
                  </div>
                  <Progress value={u.pct} className="mt-1.5" aria-label={`Uploading ${u.name}`} />
                </div>
              </div>
            ))}
          </div>
        )}
        {!fs.length ? (
          filtered ? (
            <Empty icon={SearchX} title="No results found" text="No files match your search." />
          ) : (
            <Empty icon={FolderOpen} title="No files yet" text="Upload designs, documents, and assets to share them with the project." />
          )
        ) : view === 'grid' ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3" aria-label="Files">
            {fs.map(f => (
              <FileCard key={f.id} f={f} />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-170 border-collapse" aria-label="Files">
              <thead>
                <tr>
                  <th className={cn(th, 'pl-3.5')}>Name</th>
                  <th className={th}>Type</th>
                  <th className={th}>Size</th>
                  <th className={th}>Uploaded by</th>
                  <th className={th}>Date</th>
                  <th className={th}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {fs.map(f => (
                  <FileRow key={f.id} f={f} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
