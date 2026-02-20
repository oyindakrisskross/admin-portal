import { isoToLabel } from "../../helpers";
import type { Granularity, SeriesPoint } from "../../types/reports";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const parseYmdUtc = (value?: string | null): Date | null => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
};

const toYmdUtc = (value: Date) => {
  const yyyy = value.getUTCFullYear();
  const mm = String(value.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(value.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const addDaysToYmd = (value: string, days: number) => {
  const date = parseYmdUtc(value);
  if (!date) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return toYmdUtc(date);
};

export const periodLengthDays = (start: string, end: string) => {
  const s = parseYmdUtc(start);
  const e = parseYmdUtc(end);
  if (!s || !e) return 1;
  const days = Math.floor((e.getTime() - s.getTime()) / MS_PER_DAY) + 1;
  return days > 0 ? days : 1;
};

export const calculateCompareEnd = (start: string, end: string, compareStart: string) => {
  const days = periodLengthDays(start, end);
  return addDaysToYmd(compareStart, days - 1);
};

export const defaultCompareStart = (start: string, end: string) => {
  return addDaysToYmd(end, 1) || start;
};

const percentDelta = (current: number, compare: number) => {
  if (compare === 0) return current === 0 ? 0 : null;
  return ((current - compare) / Math.abs(compare)) * 100;
};

export const buildCompareSub = (
  current: number,
  compare: number | null | undefined,
  formatValue: (value: number) => string
) => {
  if (compare == null || !Number.isFinite(compare)) return undefined;
  const delta = percentDelta(current, compare);
  const deltaText = delta == null ? "n/a" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`;
  return `Compare: ${formatValue(compare)} (${deltaText})`;
};

export const buildComparisonChartData = (
  primary: SeriesPoint[] | undefined,
  compare: SeriesPoint[] | undefined,
  granularity: Granularity
) => {
  const primarySeries = primary ?? [];
  const compareSeries = compare ?? [];
  const size = Math.max(primarySeries.length, compareSeries.length);

  return Array.from({ length: size }).map((_, idx) => {
    const currentPoint = primarySeries[idx];
    const comparePoint = compareSeries[idx];
    const currentLabel = currentPoint?.t ? isoToLabel(currentPoint.t, granularity) : "";
    const compareLabel = comparePoint?.t ? isoToLabel(comparePoint.t, granularity) : "";
    const anchorTime = currentPoint?.t ?? comparePoint?.t ?? "";
    return {
      t: anchorTime,
      label: currentLabel || compareLabel || `Point ${idx + 1}`,
      current_t: currentPoint?.t ?? null,
      compare_t: comparePoint?.t ?? null,
      current_label: currentLabel || null,
      compare_label: compareLabel || null,
      v: Number(currentPoint?.v ?? 0),
      compare_v: Number(comparePoint?.v ?? 0),
    };
  });
};
