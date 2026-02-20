import { useEffect, useState } from "react";
import { toYMD } from "../helpers";

const STORAGE_KEY = "kk_reports_date_range";

type StoredRange = { start: string; end: string };

const isYmd = (value?: string | null) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));

const readStoredRange = (): StoredRange | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isYmd(parsed?.start) || !isYmd(parsed?.end)) return null;
    return { start: parsed.start, end: parsed.end };
  } catch {
    return null;
  }
};

const writeStoredRange = (range: StoredRange) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(range));
  } catch {
    // ignore storage failures
  }
};

export const clearReportDateRange = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
};

export const useReportDateRange = (initial?: Partial<StoredRange>) => {
  const stored = readStoredRange();
  const initialStart = isYmd(initial?.start) ? initial?.start : stored?.start;
  const initialEnd = isYmd(initial?.end) ? initial?.end : stored?.end;

  const [start, setStart] = useState(() => initialStart ?? toYMD(new Date()));
  const [end, setEnd] = useState(() => initialEnd ?? toYMD(new Date()));

  useEffect(() => {
    writeStoredRange({ start, end });
  }, [start, end]);

  return { start, end, setStart, setEnd };
};
