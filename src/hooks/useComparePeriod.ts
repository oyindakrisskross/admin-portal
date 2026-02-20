import { useEffect, useMemo, useState } from "react";
import { calculateCompareEnd, defaultCompareStart, periodLengthDays } from "../components/reports/periodCompare";

type CompareRange = { start: string; end: string };

export const useComparePeriod = ({ start, end }: { start: string; end: string }) => {
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareStart, setCompareStart] = useState("");

  const periodDays = useMemo(() => periodLengthDays(start, end), [start, end]);

  useEffect(() => {
    if (!compareEnabled) return;
    if (!compareStart) setCompareStart(defaultCompareStart(start, end));
  }, [compareEnabled, compareStart, start, end]);

  const compareEnd = useMemo(() => {
    if (!compareEnabled || !compareStart) return "";
    return calculateCompareEnd(start, end, compareStart);
  }, [compareEnabled, compareStart, start, end]);

  const compareRange: CompareRange | null =
    compareEnabled && compareStart && compareEnd ? { start: compareStart, end: compareEnd } : null;

  const toggleCompare = () => setCompareEnabled((prev) => !prev);

  return {
    compareEnabled,
    setCompareEnabled,
    toggleCompare,
    compareStart,
    setCompareStart,
    compareEnd,
    compareRange,
    periodDays,
  };
};
