import { toast as sonner } from 'sonner';

export type ToastOpts = { kind?: 'ok' | 'err' | 'info'; action?: string; onAction?: () => void; ms?: number };

/** `toast(msg, { kind, action, onAction, ms })`, shown by the shadcn `<Toaster />` the root renders. An action (Undo) dismisses the toast. */
export function toast(msg: string, o: ToastOpts = {}) {
  const show = o.kind === 'err' ? sonner.error : o.kind === 'info' ? sonner.info : sonner.success;
  show(msg, { duration: o.ms ?? 4200, action: o.action ? { label: o.action, onClick: () => o.onAction?.() } : undefined });
}
