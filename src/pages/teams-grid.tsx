import { Folder, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Team } from '../domain/schema';
import { linkTo } from '../shell/shell';
import { useStore, visibleProjects } from '../store';
import { AvatarStack } from '../ui/helpers';
import { Icon } from '../ui/icon';
import { stretched } from './kit';

/** A team's icon on a tint of its colour. Size it with `className` (default 28px). */
export const TeamIcon = ({ t, className }: { t: Pick<Team, 'icon' | 'c'>; className?: string }) => (
  <span className={cn('grid size-7 shrink-0 place-items-center rounded-md bg-(--c)/16 text-tint [&_svg]:size-[55%]', className)} style={{ '--c': t.c }}>
    <Icon name={t.icon} />
  </span>
);

/** One card per team, each opening the team page (Members › Teams, Teams, Settings › Teams). */
export function TeamsGrid() {
  const d = useStore(s => s.data);
  const ps = visibleProjects(d);
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-3 max-sm:grid-cols-1">
      {d.teams.map(t => {
        const ms = d.members.filter(m => m.team === t.id);
        return (
          <div
            key={t.id}
            className="relative flex flex-col gap-3 rounded-xl border bg-card p-3.5 transition-[border-color,box-shadow] hover:border-input hover:shadow-md"
          >
            <div className="flex items-center gap-2">
              <TeamIcon t={t} />
              <a {...linkTo({ r: 'team', id: t.id })} className={cn(stretched, 'text-[14px] font-semibold')}>
                {t.name}
              </a>
            </div>
            <p className="line-clamp-2 min-h-[2.9em] text-sm text-fg-2">{t.desc}</p>
            <div className="flex items-center gap-2.5 border-t border-divider pt-2.5 text-xs text-muted-foreground [&_svg]:size-3">
              <span className="flex items-center gap-1">
                <Users />
                {`${ms.length} members`}
              </span>
              <span className="flex items-center gap-1">
                <Folder />
                {`${ps.filter(p => p.team === t.id).length} projects`}
              </span>
              <span className="relative z-10 ml-auto">
                <AvatarStack ids={ms.map(m => m.id)} max={4} />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
