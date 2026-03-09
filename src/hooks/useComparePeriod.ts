import { useEffect, useMemo, useState } from "react";
import { addDaysToYmd, addYearsToYmd, periodLengthDays } from "../components/reports/periodCompare";

type CompareRange = { start: string; end: string };
export type CompareMode = "period" | "year";
const STORAGE_KEY = "kk_reports_compare_mode";

const readStoredMode = (): CompareMode | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw === "period" || raw === "year" ? raw : null;
  } catch {
    return null;
  }
};

const writeStoredMode = (mode: CompareMode) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore storage failures
  }
};

export const useComparePeriod = ({ start, end }: { start: string; end: string }) => {
  const [compareMode, setCompareMode] = useState<CompareMode>(() => readStoredMode() ?? "period");

  useEffect(() => {
    writeStoredMode(compareMode);
  }, [compareMode]);

  const compareRange: CompareRange | null = useMemo(() => {
    if (!start || !end) return null;
    if (compareMode === "year") {
      const yearStart = addYearsToYmd(start, -1);
      const yearEnd = addYearsToYmd(end, -1);
      return yearStart && yearEnd ? { start: yearStart, end: yearEnd } : null;
    }
    const days = periodLengthDays(start, end);
    const periodStart = addDaysToYmd(start, -days);
    const periodEnd = addDaysToYmd(start, -1);
    return periodStart && periodEnd ? { start: periodStart, end: periodEnd } : null;
  }, [compareMode, end, start]);

  return {
    compareEnabled: Boolean(compareRange),
    compareMode,
    setCompareMode,
    compareRange,
  };
};
