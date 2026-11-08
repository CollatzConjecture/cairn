/** Dates in the data are local `yyyy-MM-dd` strings; timestamps are epoch milliseconds. */
export type DateInput = string | number | Date;

export const DAY = 864e5;
export const sod = (d: DateInput) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
/** Start of today, fixed when the app loads. */
export const TODAY = sod(new Date());
export const iso = (d: DateInput) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
export function parse(s: string): Date;
export function parse(s: string | null | undefined): Date | null;
export function parse(s: string | null | undefined) {
  if (!s) return null;
  const [y = 0, m = 1, d = 1] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export const addD = (d: DateInput, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const dOff = (n: number) => iso(addD(TODAY, n));
export const diffD = (a: DateInput, b: DateInput) => Math.round((sod(a).getTime() - sod(b).getTime()) / DAY);
export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
export const MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;
export const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export const DATE_FORMATS = ['MMM d', 'd/M', 'M/d', 'yyyy-MM-dd'] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];
let dateFormat: DateFormat = 'MMM d';
/** Called whenever preferences apply (src/shell/prefs.ts), so date helpers never read the store. */
export function setDateFormat(f: DateFormat) {
  dateFormat = f;
}
export function fmtDate(s: string | Date | null | undefined, long?: boolean) {
  const d = typeof s === 'string' ? parse(s) : s;
  if (!d) return '';
  if (dateFormat === 'd/M') return `${d.getDate()}/${d.getMonth() + 1}${long ? '/' + d.getFullYear() : ''}`;
  if (dateFormat === 'M/d') return `${d.getMonth() + 1}/${d.getDate()}${long ? '/' + d.getFullYear() : ''}`;
  if (dateFormat === 'yyyy-MM-dd') return iso(d);
  return `${MON[d.getMonth()]} ${d.getDate()}${long || d.getFullYear() !== TODAY.getFullYear() ? ', ' + d.getFullYear() : ''}`;
}
export function relDate(s: string | null | undefined) {
  if (!s) return '';
  const n = diffD(parse(s), TODAY);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  if (n > 1 && n < 7) return WD[parse(s).getDay()];
  return fmtDate(s);
}
export function ago(ts: number) {
  const m = Math.round((Date.now() - ts) / 6e4);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.round(m / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.round(h / 24);
  if (d < 7) return d + 'd ago';
  return fmtDate(iso(new Date(ts)));
}
export const minsAgo = (m: number) => Date.now() - m * 6e4;
export function dayBucket(ts: number) {
  const n = diffD(new Date(ts), TODAY);
  if (n === 0) return 'Today';
  if (n === -1) return 'Yesterday';
  if (n > -7) return 'This week';
  return 'Earlier';
}
/** `weekStart` is `prefs.weekStart`: 0 Sunday, 1 Monday, 6 Saturday. */
export function startOfWeek(d: DateInput, weekStart: number) {
  const x = sod(d);
  const diff = (x.getDay() - weekStart + 7) % 7;
  return addD(x, -diff);
}
