/* Comments: one comment with its reactions, and the box that posts one. */
import { useRef } from 'react';
import { AtSign, Paperclip, SmilePlus, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MOD } from '../domain/constants';
import { ago } from '../domain/date';
import type { TaskId } from '../domain/ids';
import type { Comment, Member } from '../domain/schema';
import { memberById, mutate, postComment, restore, set, setDraft, snapshot, toast, uploadFiles, useStore } from '../store';
import { Avatar, CommentText, Tip } from '../ui/helpers';
import { EmojiPicker, react } from './emoji-picker';

export function delComment(c: Comment) {
  const snap = snapshot();
  if (
    mutate(s => {
      s.data.comments = s.data.comments.filter(x => x.id !== c.id);
    })
  )
    toast('Comment deleted', { action: 'Undo', onAction: () => restore(snap) });
}

const reactBtn =
  'inline-flex h-5.5 items-center gap-1 rounded-full border bg-background px-1.75 text-xs transition-[background-color,border-color,transform] hover:bg-muted active:scale-97';

/** Author, time, text with mentions, reactions. Your own comments can be deleted. */
export function CommentItem({ c }: { c: Comment }) {
  const d = useStore(s => s.data);
  const m = memberById(d, c.by);
  return (
    <div className="flex gap-2.5 py-2.5">
      <Avatar id={c.by} size="md" tip={false} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 text-sm">
          <b className="font-semibold">{m?.name}</b>
          <time className="text-xs text-muted-foreground">{ago(c.at)}</time>
          {c.by === d.me && (
            <Tip label="Delete">
              <Button variant="ghost" size="icon-xs" className="ml-auto self-center" aria-label="Delete comment" onClick={() => delComment(c)}>
                <Trash className="size-3" />
              </Button>
            </Tip>
          )}
        </div>
        <div className="mt-0.75 text-base leading-[1.55] break-words whitespace-pre-wrap">
          <CommentText text={c.text} />
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {Object.entries(c.re)
            .filter(([, who]) => who.length)
            .map(([e, who]) => (
              <button
                key={e}
                className={cn(reactBtn, who.includes(d.me) && 'border-primary-line bg-primary-soft hover:bg-primary-soft')}
                aria-label={`${e} ${who.length}`}
                aria-pressed={who.includes(d.me)}
                title={who.map(i => memberById(d, i)?.name).join(', ')}
                onClick={() => react(c.id, e)}
              >
                {e}
                <span className="tabular-nums">{who.length}</span>
              </button>
            ))}
          <EmojiPicker id={c.id}>
            <button className={cn(reactBtn, 'text-muted-foreground')} aria-label="Add reaction">
              <SmilePlus className="size-3.25" />
            </button>
          </EmojiPicker>
        </div>
      </div>
    </div>
  );
}

/** The members an `@q` being typed can mention: first or last name starts with `q`. */
function mentionable(members: readonly Member[], q: string) {
  const l = q.toLowerCase();
  return members.filter(m => m.name.toLowerCase().startsWith(l) || m.name.split(' ')[1]?.toLowerCase().startsWith(l)).slice(0, 5);
}

/** The drawer's comment box: `@` opens a mention list, Mod+Enter posts, the clip attaches files to the task. */
export function CommentBox({ tid }: { tid: TaskId }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const d = useStore(s => s.data);
  const draft = useStore(s => s.ui.drafts[tid] ?? '');
  const mention = useStore(s => (s.ui.mention?.tid === tid ? s.ui.mention : null));
  const t = d.tasks.find(x => x.id === tid);
  const list = mention ? mentionable(d.members, mention.q) : [];
  const focusEnd = () =>
    requestAnimationFrame(() => {
      const ta = ref.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    });
  const writeDraft = (v: string, m: typeof mention) =>
    set(s => {
      s.ui.drafts[tid] = v;
      s.ui.mention = m;
    });
  const pick = (name: string) => {
    writeDraft(draft.replace(/@([A-Za-z]*)$/, '@' + name + ' '), null);
    focusEnd();
  };
  const post = () => {
    if (!postComment(tid)) ref.current?.focus();
  };
  return (
    <div className="mt-2 flex items-start gap-2.5">
      <Avatar id={d.me} size="md" tip={false} />
      <div className="relative min-w-0 flex-1">
        <div className="flex flex-col gap-1.5 rounded-md border border-input bg-background px-2.5 py-2 transition-[border-color,box-shadow] focus-within:border-primary focus-within:ring-3 focus-within:ring-primary-soft">
          <textarea
            ref={ref}
            className="field-sizing-content min-h-10 resize-none bg-transparent text-base leading-normal outline-none placeholder:text-muted-foreground"
            rows={2}
            placeholder="Leave a comment… type @ to mention"
            aria-label="Comment"
            value={draft}
            onChange={e => setDraft(tid, e.currentTarget.value, e.currentTarget.selectionStart)}
            onKeyDown={e => {
              if (e.key === 'Escape' && mention) {
                e.preventDefault();
                e.stopPropagation();
                writeDraft(draft, null);
              } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                post();
              }
            }}
          />
          <div className="flex items-center gap-1">
            <Tip label="Mention someone">
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Mention"
                onClick={() => {
                  writeDraft(draft + (draft && !draft.endsWith(' ') ? ' @' : '@'), { tid, q: '' });
                  focusEnd();
                }}
              >
                <AtSign />
              </Button>
            </Tip>
            {t && (
              <Tip label="Attach file">
                <Button variant="ghost" size="icon-xs" aria-label="Attach file" render={<label />} nativeButton={false}>
                  <Paperclip />
                  <input
                    type="file"
                    multiple
                    hidden
                    onChange={e => {
                      uploadFiles(e.currentTarget.files ?? [], { project: t.project, task: t.id });
                      e.currentTarget.value = '';
                    }}
                  />
                </Button>
              </Tip>
            )}
            <span className="ml-auto text-2xs text-muted-foreground max-sm:hidden">{`${MOD}+Enter`}</span>
            <Button size="sm" onClick={post}>
              Comment
            </Button>
          </div>
        </div>
        {list.length > 0 && (
          <div
            className="absolute bottom-[calc(100%+4px)] left-0 z-10 min-w-50 rounded-xl bg-popover p-1 shadow-md ring-1 ring-foreground/10"
            role="group"
            aria-label="Mention suggestions"
          >
            {list.map(m => (
              <button
                key={m.id}
                className="flex min-h-7.5 w-full items-center gap-2.25 rounded-md px-2 text-left text-base whitespace-nowrap hover:bg-muted focus-visible:bg-muted"
                onMouseDown={e => e.preventDefault()}
                onClick={() => pick(m.name)}
              >
                <Avatar id={m.id} size="sm" tip={false} />
                {m.name}
                <span className="ml-auto pl-3 text-xs text-muted-foreground">{m.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
