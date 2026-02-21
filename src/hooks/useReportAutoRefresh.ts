import { useEffect, useState } from "react";

type UseReportAutoRefreshOptions = {
  intervalMs?: number;
  refreshOnVisibility?: boolean;
  start?: string;
  end?: string;
  onlyWhenRangeIncludesToday?: boolean;
};

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function todayIsoLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function rangeIncludesToday(start?: string, end?: string) {
  if (!start || !end) return true;
  if (!isIsoDate(start) || !isIsoDate(end)) return true;

  const rangeStart = start <= end ? start : end;
  const rangeEnd = end >= start ? end : start;
  const today = todayIsoLocal();
  return rangeStart <= today && today <= rangeEnd;
}

export function useReportAutoRefresh(options: UseReportAutoRefreshOptions = {}) {
  const {
    intervalMs = 30_000,
    refreshOnVisibility = true,
    start,
    end,
    onlyWhenRangeIncludesToday = false,
  } = options;
  const [refreshTick, setRefreshTick] = useState(0);
  const shouldAutoRefresh = onlyWhenRangeIncludesToday ? rangeIncludesToday(start, end) : true;

  useEffect(() => {
    if (!shouldAutoRefresh) return;

    const triggerRefresh = () => {
      if (document.visibilityState === "hidden") return;
      setRefreshTick((prev) => prev + 1);
    };

    const intervalId = window.setInterval(triggerRefresh, intervalMs);

    const onVisibilityChange = () => {
      if (!refreshOnVisibility) return;
      if (document.visibilityState === "visible") {
        setRefreshTick((prev) => prev + 1);
      }
    };

    if (refreshOnVisibility) {
      document.addEventListener("visibilitychange", onVisibilityChange);
    }

    return () => {
      window.clearInterval(intervalId);
      if (refreshOnVisibility) {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    };
  }, [intervalMs, refreshOnVisibility, shouldAutoRefresh]);

  return refreshTick;
}
