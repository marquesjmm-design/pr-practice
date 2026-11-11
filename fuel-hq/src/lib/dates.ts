// Datas tratadas como dias UTC inteiros para evitar problemas de fuso horário.
const DAY_MS = 86_400_000;

export function toDay(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function fromDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function dayParts(day: number) {
  const dt = new Date(day * DAY_MS);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), wd: (dt.getUTCDay() + 6) % 7 };
}

/** 0 = segunda … 6 = domingo */
export function weekday(day: number): number {
  return (new Date(day * DAY_MS).getUTCDay() + 6) % 7;
}

export function mondayOf(day: number): number {
  return day - weekday(day);
}

export function monthKey(day: number): string {
  return fromDay(day).slice(0, 7);
}

export function addMonths(day: number, n: number): number {
  const { y, m, d } = dayParts(day);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return Math.floor(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(d, lastDay)) / DAY_MS);
}

export const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const WEEKDAYS_PT = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

export function formatDayPt(day: number): string {
  const { y, m, d } = dayParts(day);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

export function shortDayPt(day: number): string {
  const { m, d } = dayParts(day);
  return `${d} ${MONTHS_PT[m - 1]}`;
}
