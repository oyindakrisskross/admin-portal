import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { toYMD } from "../../helpers";
import { parseYmd } from "./DatePicker";

type DateGate = "is" | "between" | "relative";
type RelativeRelation = "past" | "this";
type RelativeUnit = "day" | "week" | "month" | "year";
type ActiveBetweenField = "start" | "end";
type CompareToMode = "period" | "year";

interface RangeValue {
  start: string;
  end: string;
}

interface Props {
  start: string;
  end: string;
  compareTo?: CompareToMode;
  onApply: (next: RangeValue & { compareTo: CompareToMode }) => void;
  label?: string;
}

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const asDateOnly = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

const dateFromYmd = (value?: string | null) => {
  const dt = parseYmd(value);
  return dt ? asDateOnly(dt) : null;
};

const addDays = (value: Date, days: number) => {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return asDateOnly(next);
};

const addMonthsKeepingDay = (value: Date, months: number) => {
  const day = value.getDate();
  const next = new Date(value.getFullYear(), value.getMonth(), 1);
  next.setMonth(next.getMonth() + months);
  const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, maxDay));
  return asDateOnly(next);
};

const addYearsKeepingDay = (value: Date, years: number) => {
  const day = value.getDate();
  const month = value.getMonth();
  const next = new Date(value.getFullYear() + years, month, 1);
  const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, maxDay));
  return asDateOnly(next);
};

const startOfWeekSunday = (value: Date) => addDays(value, -value.getDay());
const endOfWeekSaturday = (value: Date) => addDays(startOfWeekSunday(value), 6);
const startOfMonth = (value: Date) => new Date(value.getFullYear(), value.getMonth(), 1);
const endOfMonth = (value: Date) => new Date(value.getFullYear(), value.getMonth() + 1, 0);
const startOfYear = (value: Date) => new Date(value.getFullYear(), 0, 1);
const endOfYear = (value: Date) => new Date(value.getFullYear(), 11, 31);

const MONTH_NAMES = Array.from({ length: 12 }).map((_, index) =>
  new Date(2000, index, 1).toLocaleDateString("en-NG", { month: "long" })
);

const dateLabel = (value?: string | null) => {
  const dt = dateFromYmd(value);
  if (!dt) return "";
  return dt.toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
};

const isAfter = (a: Date, b: Date) => asDateOnly(a).getTime() > asDateOnly(b).getTime();
const isBefore = (a: Date, b: Date) => asDateOnly(a).getTime() < asDateOnly(b).getTime();

const inRange = (value: Date, start?: Date | null, end?: Date | null) => {
  if (!start || !end) return false;
  const cur = asDateOnly(value).getTime();
  const lo = Math.min(asDateOnly(start).getTime(), asDateOnly(end).getTime());
  const hi = Math.max(asDateOnly(start).getTime(), asDateOnly(end).getTime());
  return cur >= lo && cur <= hi;
};

const computeRelativeRange = (
  relation: RelativeRelation,
  amount: number,
  unit: RelativeUnit,
  today: Date
): RangeValue => {
  if (relation === "this") {
    if (unit === "day") {
      const y = toYMD(today);
      return { start: y, end: y };
    }
    if (unit === "week") {
      return { start: toYMD(startOfWeekSunday(today)), end: toYMD(endOfWeekSaturday(today)) };
    }
    if (unit === "month") {
      return { start: toYMD(startOfMonth(today)), end: toYMD(endOfMonth(today)) };
    }
    return { start: toYMD(startOfYear(today)), end: toYMD(endOfYear(today)) };
  }

  const n = Math.max(1, Math.floor(Number(amount) || 1));
  if (unit === "day") {
    return { start: toYMD(addDays(today, -n)), end: toYMD(today) };
  }
  if (unit === "week") {
    return { start: toYMD(addDays(today, -(7 * n))), end: toYMD(today) };
  }
  if (unit === "month") {
    return { start: toYMD(addMonthsKeepingDay(today, -n)), end: toYMD(today) };
  }
  return { start: toYMD(addYearsKeepingDay(today, -n)), end: toYMD(today) };
};

const clampToTodayYmd = (value: string, today: Date) => {
  const dt = dateFromYmd(value);
  if (!dt) return toYMD(today);
  return isAfter(dt, today) ? toYMD(today) : toYMD(dt);
};

const normalizeBetween = (start: string, end: string, today: Date): RangeValue => {
  const safeStart = clampToTodayYmd(start, today);
  const safeEnd = clampToTodayYmd(end, today);
  const startDate = dateFromYmd(safeStart)!;
  const endDate = dateFromYmd(safeEnd)!;
  if (isAfter(startDate, endDate)) return { start: safeEnd, end: safeStart };
  return { start: safeStart, end: safeEnd };
};

interface DraftState {
  gate: DateGate;
  singleDate: string;
  betweenStart: string;
  betweenEnd: string;
  betweenActive: ActiveBetweenField;
  relation: RelativeRelation;
  relativeAmount: number;
  relativeUnit: RelativeUnit;
  compareTo: CompareToMode;
}

const initialDraft = (start: string, end: string, today: Date, compareTo: CompareToMode): DraftState => {
  const safeStart = clampToTodayYmd(start || toYMD(today), today);
  const safeEnd = clampToTodayYmd(end || safeStart, today);
  const normalizedBetween = normalizeBetween(safeStart, safeEnd, today);
  return {
    gate: safeStart === safeEnd ? "is" : "between",
    singleDate: safeEnd,
    betweenStart: normalizedBetween.start,
    betweenEnd: normalizedBetween.end,
    betweenActive: "start",
    relation: "this",
    relativeAmount: 1,
    relativeUnit: "week",
    compareTo,
  };
};

const formatSummary = (start: string, end: string) => {
  const s = dateLabel(start);
  const e = dateLabel(end);
  if (!s && !e) return "Select date range";
  if (start === end) return s || e;
  return `${s} - ${e}`;
};

const compareRangeForDisplay = (start: string, end: string, mode: CompareToMode): RangeValue | null => {
  const s = dateFromYmd(start);
  const e = dateFromYmd(end);
  if (!s || !e) return null;

  const startDate = isBefore(s, e) ? s : e;
  const endDate = isBefore(s, e) ? e : s;

  if (mode === "year") {
    return {
      start: toYMD(addYearsKeepingDay(startDate, -1)),
      end: toYMD(addYearsKeepingDay(endDate, -1)),
    };
  }

  const diffDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return {
    start: toYMD(addDays(startDate, -diffDays)),
    end: toYMD(addDays(startDate, -1)),
  };
};

const toggleIconClass =
  "rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-1.5 py-0.5 text-xs text-kk-dark-text";

export const ReportDateRangePicker: React.FC<Props> = ({
  start,
  end,
  compareTo = "period",
  onApply,
  label = "Date range",
}) => {
  const today = useMemo(() => asDateOnly(new Date()), []);
  const todayYmd = useMemo(() => toYMD(today), [today]);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftState>(() => initialDraft(start, end, today, compareTo));
  const [month, setMonth] = useState<Date>(() => dateFromYmd(end) ?? today);
  const [hoveredYmd, setHoveredYmd] = useState<string | null>(null);
  const [lastGate, setLastGate] = useState<DateGate>(() => (start === end ? "is" : "between"));
  const [showMonthMenu, setShowMonthMenu] = useState(false);
  const [showYearMenu, setShowYearMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const currentYear = today.getFullYear();
  const currentMonthIndex = today.getMonth();
  const compareSummaryText = useMemo(() => {
    const range = compareRangeForDisplay(start, end, compareTo);
    if (!range) return "";
    const s = dateLabel(range.start);
    const e = dateLabel(range.end);
    if (!s && !e) return "";
    if (range.start === range.end) return `Compare: ${s || e}`;
    return `Compare: ${s} - ${e}`;
  }, [compareTo, end, start]);

  const effectiveRange = useMemo<RangeValue>(() => {
    if (draft.gate === "is") {
      const value = clampToTodayYmd(draft.singleDate || todayYmd, today);
      return { start: value, end: value };
    }

    if (draft.gate === "between") {
      if (!draft.betweenStart || !draft.betweenEnd) {
        return { start: "", end: "" };
      }
      return normalizeBetween(draft.betweenStart, draft.betweenEnd, today);
    }

    return computeRelativeRange(draft.relation, draft.relativeAmount, draft.relativeUnit, today);
  }, [draft, today, todayYmd]);

  const previewRange = useMemo(() => {
    if (draft.gate !== "between" || draft.betweenActive !== "end") return null;
    if (!draft.betweenStart || !hoveredYmd) return null;
    const hover = dateFromYmd(hoveredYmd);
    const startDate = dateFromYmd(draft.betweenStart);
    if (!hover || !startDate) return null;
    if (isBefore(hover, startDate) || isAfter(hover, today)) return null;
    return { start: draft.betweenStart, end: hoveredYmd };
  }, [draft.betweenActive, draft.betweenStart, draft.gate, hoveredYmd, today]);

  const selectedStart = dateFromYmd(effectiveRange.start);
  const selectedEnd = dateFromYmd(effectiveRange.end);
  const previewStart = dateFromYmd(previewRange?.start);
  const previewEnd = dateFromYmd(previewRange?.end);
  const canGoNextMonth =
    month.getFullYear() < currentYear ||
    (month.getFullYear() === currentYear && month.getMonth() < currentMonthIndex);
  const allowedMonthIndexes = useMemo(
    () =>
      month.getFullYear() === currentYear
        ? Array.from({ length: currentMonthIndex + 1 }).map((_, idx) => idx)
        : Array.from({ length: 12 }).map((_, idx) => idx),
    [currentMonthIndex, currentYear, month]
  );
  const yearOptions = useMemo(
    () => Array.from({ length: 31 }).map((_, idx) => currentYear - idx),
    [currentYear]
  );

  const goToTodayMonth = () => {
    setMonth(new Date(currentYear, currentMonthIndex, 1));
    setShowMonthMenu(false);
    setShowYearMenu(false);
  };

  const onSelectYear = (year: number) => {
    setMonth((prev) => {
      const nextMonthIndex = year === currentYear ? Math.min(prev.getMonth(), currentMonthIndex) : prev.getMonth();
      return new Date(year, nextMonthIndex, 1);
    });
    setShowYearMenu(false);
  };

  const onSelectMonth = (monthIndex: number) => {
    setMonth((prev) => new Date(prev.getFullYear(), monthIndex, 1));
    setShowMonthMenu(false);
  };

  const openPicker = () => {
    const base = initialDraft(start, end, today, compareTo);
    setDraft((prev) => {
      const nextGate = lastGate === "relative" ? "relative" : base.gate;
      return {
        ...base,
        gate: nextGate,
        relation: prev.relation,
        relativeAmount: prev.relativeAmount,
        relativeUnit: prev.relativeUnit,
        compareTo,
      };
    });
    setMonth(dateFromYmd(end) ?? today);
    setHoveredYmd(null);
    setShowMonthMenu(false);
    setShowYearMenu(false);
    setOpen(true);
  };

  const closeWithoutApply = () => {
    setOpen(false);
    setHoveredYmd(null);
    setShowMonthMenu(false);
    setShowYearMenu(false);
  };

  useEffect(() => {
    if (open) return;
    if (lastGate !== "relative") {
      setLastGate(start === end ? "is" : "between");
    }
  }, [end, lastGate, open, start]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        closeWithoutApply();
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeWithoutApply();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const isDisabledDate = (value: Date) => {
    if (draft.gate === "relative") return true;
    if (isAfter(value, today)) return true;
    if (draft.gate === "between" && draft.betweenActive === "end" && draft.betweenStart) {
      const s = dateFromYmd(draft.betweenStart);
      if (s && isBefore(value, s)) return true;
    }
    return false;
  };

  const onSelectDate = (ymd: string) => {
    const picked = dateFromYmd(ymd);
    if (!picked || isDisabledDate(picked)) return;

    if (draft.gate === "is") {
      setDraft((prev) => ({ ...prev, singleDate: ymd }));
      return;
    }

    if (draft.gate === "between") {
      if (draft.betweenActive === "start") {
        setDraft((prev) => {
          const nextEnd = prev.betweenEnd && prev.betweenEnd >= ymd ? prev.betweenEnd : ymd;
          return {
            ...prev,
            betweenStart: ymd,
            betweenEnd: nextEnd,
            betweenActive: "end",
          };
        });
      } else {
        setDraft((prev) => ({ ...prev, betweenEnd: ymd }));
      }
    }
  };

  const canApply =
    draft.gate === "is"
      ? Boolean(draft.singleDate)
      : draft.gate === "between"
      ? Boolean(draft.betweenStart && draft.betweenEnd)
      : true;

  const applyDraft = () => {
    if (!canApply || !effectiveRange.start || !effectiveRange.end) return;
    setLastGate(draft.gate);
    onApply({ ...effectiveRange, compareTo: draft.compareTo });
    setOpen(false);
    setHoveredYmd(null);
    setShowMonthMenu(false);
    setShowYearMenu(false);
  };

  const days = useMemo(() => {
    const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const gridStart = addDays(firstOfMonth, -firstOfMonth.getDay());
    return Array.from({ length: 42 }).map((_, idx) => addDays(gridStart, idx));
  }, [month]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="text-xs text-kk-dark-text-muted">{label}</label>
      <button
        type="button"
        onClick={() => (open ? closeWithoutApply() : openPicker())}
        className="mt-1 flex w-full items-center justify-between rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-left text-sm"
      >
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate">{formatSummary(start, end)}</span>
          {compareSummaryText ? (
            <span className="block truncate text-xs text-kk-dark-text-muted">{compareSummaryText}</span>
          ) : null}
        </span>
        <ChevronDown className="h-4 w-4 text-kk-dark-text-muted" />
      </button>

      {open ? (
        <div className="absolute left-0 z-50 mt-2 w-[18.5rem] max-w-[calc(100vw-1rem)] rounded-xl border border-kk-dark-input-border bg-kk-dark-bg-elevated p-2 shadow-2xl">
          <div className="mb-2 flex items-center gap-1.5">
            <div className="text-xs font-medium text-kk-dark-text">Date</div>
            <select
              className={`${toggleIconClass} w-full flex-1`}
              value={draft.gate}
              onChange={(event) => {
                const next = event.target.value as DateGate;
                setDraft((prev) => ({
                  ...prev,
                  gate: next,
                  betweenActive: "start",
                }));
              }}
            >
              <option value="is">Is</option>
              <option value="between">Is between</option>
              <option value="relative">Is relative to today</option>
            </select>
          </div>

          {draft.gate === "between" ? (
            <div className="mb-2 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                className={`rounded-md border px-1.5 py-1 text-left text-xs ${
                  draft.betweenActive === "start"
                    ? "border-[#2d7dd2] bg-kk-dark-bg-elevated"
                    : "border-kk-dark-input-border bg-kk-dark-bg"
                }`}
                onClick={() => setDraft((prev) => ({ ...prev, betweenActive: "start" }))}
              >
                {draft.betweenStart ? dateLabel(draft.betweenStart) : <span className="text-kk-dark-text-muted">Starting</span>}
              </button>
              <button
                type="button"
                className={`rounded-md border px-2 py-1 text-left text-sm ${
                  draft.betweenActive === "end"
                    ? "border-[#2d7dd2] bg-kk-dark-bg-elevated"
                    : "border-kk-dark-input-border bg-kk-dark-bg"
                }`}
                onClick={() => setDraft((prev) => ({ ...prev, betweenActive: "end" }))}
              >
                {draft.betweenEnd ? dateLabel(draft.betweenEnd) : <span className="text-kk-dark-text-muted">Ending</span>}
              </button>
            </div>
          ) : null}

          {draft.gate === "relative" ? (
            <div className="mb-2 flex items-center gap-1.5">
              <select
                className={`${toggleIconClass} min-w-0 flex-1`}
                value={draft.relation}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    relation: event.target.value as RelativeRelation,
                  }))
                }
              >
                <option value="past">Past</option>
                <option value="this">This</option>
              </select>

              {draft.relation === "past" ? (
                <input
                  type="number"
                  min={1}
                  value={draft.relativeAmount}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      relativeAmount: Math.max(1, Math.floor(Number(event.target.value) || 1)),
                    }))
                  }
                  className="w-14 rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-1.5 py-0.5 text-xs"
                />
              ) : null}

              <select
                className={`${toggleIconClass} min-w-0 flex-1`}
                value={draft.relativeUnit}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    relativeUnit: event.target.value as RelativeUnit,
                  }))
                }
              >
                <option value="day">day</option>
                <option value="week">week</option>
                <option value="month">month</option>
                <option value="year">year</option>
              </select>
            </div>
          ) : null}

          <div className="mb-1.5 flex items-center gap-1.5">
            <div className="flex min-w-0 items-center gap-1">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowMonthMenu((prev) => !prev);
                    setShowYearMenu(false);
                  }}
                  className="inline-flex max-w-[7rem] items-center gap-0.5 rounded-md px-0.5 py-0.5 text-sm font-semibold text-kk-dark-text hover:bg-kk-dark-hover"
                >
                  <span className="truncate">{MONTH_NAMES[month.getMonth()]}</span>
                  <ChevronDown className="h-3 w-3 text-kk-dark-text-muted" />
                </button>
                {showMonthMenu ? (
                  <div className="absolute left-0 top-full z-20 mt-1 max-h-52 w-32 overflow-y-auto rounded-md border border-kk-dark-input-border bg-kk-dark-bg shadow-xl">
                    {MONTH_NAMES.map((labelText, monthIndex) => {
                      const disabled = !allowedMonthIndexes.includes(monthIndex);
                      const selected = monthIndex === month.getMonth();
                      return (
                        <button
                          key={labelText}
                          type="button"
                          disabled={disabled}
                          onClick={() => onSelectMonth(monthIndex)}
                          className={[
                            "w-full px-2 py-1 text-left text-xs",
                            selected ? "bg-kk-dark-hover text-kk-dark-text" : "text-kk-dark-text",
                            disabled ? "cursor-not-allowed opacity-40" : "hover:bg-kk-dark-hover",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {labelText}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowYearMenu((prev) => !prev);
                    setShowMonthMenu(false);
                  }}
                  className="inline-flex items-center gap-0.5 rounded-md px-0.5 py-0.5 text-sm font-semibold text-kk-dark-text hover:bg-kk-dark-hover"
                >
                  {month.getFullYear()}
                  <ChevronDown className="h-3 w-3 text-kk-dark-text-muted" />
                </button>
                {showYearMenu ? (
                  <div className="absolute left-0 top-full z-20 mt-1 max-h-52 w-20 overflow-y-auto rounded-md border border-kk-dark-input-border bg-kk-dark-bg shadow-xl">
                    {yearOptions.map((year) => {
                      const selected = year === month.getFullYear();
                      return (
                        <button
                          key={year}
                          type="button"
                          onClick={() => onSelectYear(year)}
                          className={[
                            "w-full px-2 py-1 text-left text-xs",
                            selected ? "bg-kk-dark-hover text-kk-dark-text" : "text-kk-dark-text hover:bg-kk-dark-hover",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {year}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={goToTodayMonth}
                className="ml-0.5 text-xs font-medium text-[#2d7dd2] hover:underline"
              >
                Today
              </button>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={() => {
                  setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
                  setShowMonthMenu(false);
                  setShowYearMenu(false);
                }}
                className="rounded-md p-0.5 text-kk-dark-text-muted hover:bg-kk-dark-hover hover:text-kk-dark-text"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={!canGoNextMonth}
                onClick={() => {
                  if (!canGoNextMonth) return;
                  setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                  setShowMonthMenu(false);
                  setShowYearMenu(false);
                }}
                className="rounded-md p-0.5 text-kk-dark-text-muted hover:bg-kk-dark-hover hover:text-kk-dark-text disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-kk-dark-text-muted">
            {WEEKDAY_LABELS.map((day) => (
              <div key={day} className="py-0.5">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const ymd = toYMD(day);
              const isToday = ymd === todayYmd;
              const isSameMonth = day.getMonth() === month.getMonth();
              const disabled = isDisabledDate(day);
              const startSelected = selectedStart ? toYMD(selectedStart) === ymd : false;
              const endSelected = selectedEnd ? toYMD(selectedEnd) === ymd : false;
              const selected = startSelected || endSelected;
              const inSelectedRange = inRange(day, selectedStart, selectedEnd);
              const inHoverRange = inRange(day, previewStart, previewEnd);
              const highlightedRange = selected ? false : inSelectedRange || inHoverRange;
              const hovered = hoveredYmd === ymd && !disabled;
              const showTodayBadge = isToday && !inSelectedRange && !inHoverRange;

              return (
                <button
                  key={ymd}
                  type="button"
                  disabled={disabled}
                  onMouseEnter={() => setHoveredYmd(ymd)}
                  onMouseLeave={() => setHoveredYmd((prev) => (prev === ymd ? null : prev))}
                  onClick={() => onSelectDate(ymd)}
                  className={[
                    "h-7 rounded-md text-xs transition-colors",
                    isSameMonth ? "text-kk-dark-text" : "text-kk-dark-text-muted/60",
                    disabled ? "cursor-not-allowed opacity-50" : "",
                    highlightedRange ? "bg-[#355374]" : "",
                    selected ? "bg-[#2d7dd2] text-white font-semibold" : "",
                    hovered && !selected ? "bg-[#25384d]" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center ${
                      showTodayBadge ? "rounded-full bg-[#d95c5c] text-white" : ""
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-2 border-t border-kk-dark-input-border pt-2">
            <div className="text-[11px] font-medium text-kk-dark-text">Compare To</div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="text-[11px] text-kk-dark-text-muted">Previous</div>
              <select
                className={`${toggleIconClass} w-full flex-1`}
                value={draft.compareTo}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    compareTo: event.target.value as CompareToMode,
                  }))
                }
              >
                <option value="period">period</option>
                <option value="year">year</option>
              </select>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={closeWithoutApply}
              className="rounded-md border border-kk-dark-input-border px-2 py-1 text-xs text-kk-dark-text-muted hover:text-kk-dark-text"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canApply}
              onClick={applyDraft}
              className="rounded-md bg-[#2d7dd2] px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
            >
              Update
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
