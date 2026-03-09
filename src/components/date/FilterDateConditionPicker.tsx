import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { toYMD } from "../../helpers";
import { parseYmd } from "./DatePicker";

type DateGate =
  | "on"
  | "between"
  | "relative"
  | "before"
  | "after"
  | "on_or_before"
  | "on_or_after";
type RelativeRelation = "past" | "this";
type RelativeUnit = "day" | "week" | "month" | "year";
type ActiveBetweenField = "start" | "end";

interface Props {
  initialOperator?: string | null;
  initialValue?: any;
  onApply: (operator: DateGate, value: any) => void;
  onCancel: () => void;
}

interface RangeValue {
  start: string;
  end: string;
}

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = Array.from({ length: 12 }).map((_, index) =>
  new Date(2000, index, 1).toLocaleDateString("en-NG", { month: "long" })
);
const toggleIconClass =
  "rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-1.5 py-0.5 text-xs text-left text-kk-dark-text";

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

const isAfter = (a: Date, b: Date) => asDateOnly(a).getTime() > asDateOnly(b).getTime();
const isBefore = (a: Date, b: Date) => asDateOnly(a).getTime() < asDateOnly(b).getTime();

const inRange = (value: Date, start?: Date | null, end?: Date | null) => {
  if (!start || !end) return false;
  const cur = asDateOnly(value).getTime();
  const lo = Math.min(asDateOnly(start).getTime(), asDateOnly(end).getTime());
  const hi = Math.max(asDateOnly(start).getTime(), asDateOnly(end).getTime());
  return cur >= lo && cur <= hi;
};

const dateLabel = (value?: string | null) => {
  const dt = dateFromYmd(value);
  if (!dt) return "";
  return dt.toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
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

const isSingleDateGate = (gate: DateGate) =>
  gate === "on" || gate === "before" || gate === "after" || gate === "on_or_before" || gate === "on_or_after";

const toGate = (operator?: string | null): DateGate => {
  if (operator === "between") return "between";
  if (operator === "relative") return "relative";
  if (operator === "before") return "before";
  if (operator === "after") return "after";
  if (operator === "on_or_before") return "on_or_before";
  if (operator === "on_or_after") return "on_or_after";
  return "on";
};

const extractInitialState = (
  initialOperator: string | null | undefined,
  initialValue: any,
  today: Date
) => {
  const gate = toGate(initialOperator);
  const fallbackYmd = toYMD(today);

  let singleDate = fallbackYmd;
  let betweenStart = fallbackYmd;
  let betweenEnd = fallbackYmd;
  let betweenActive: ActiveBetweenField = "start";
  let relation: RelativeRelation = "this";
  let relativeAmount = 1;
  let relativeUnit: RelativeUnit = "week";

  if (gate === "between" && Array.isArray(initialValue)) {
    const start = String(initialValue[0] || "").trim();
    const end = String(initialValue[1] || "").trim();
    const normalized = normalizeBetween(start || fallbackYmd, end || fallbackYmd, today);
    betweenStart = normalized.start;
    betweenEnd = normalized.end;
    betweenActive = "start";
  } else if (gate === "relative" && typeof initialValue === "object" && initialValue) {
    relation = initialValue.direction === "past" ? "past" : "this";
    relativeAmount = Math.max(1, Math.floor(Number(initialValue.amount ?? 1) || 1));
    relativeUnit =
      initialValue.unit === "day" ||
      initialValue.unit === "week" ||
      initialValue.unit === "month" ||
      initialValue.unit === "year"
        ? initialValue.unit
        : "week";
  } else if (isSingleDateGate(gate)) {
    singleDate = clampToTodayYmd(String(initialValue || fallbackYmd), today);
  }

  const monthAnchor =
    gate === "between"
      ? dateFromYmd(betweenEnd) ?? today
      : gate === "relative"
      ? dateFromYmd(computeRelativeRange(relation, relativeAmount, relativeUnit, today).end) ?? today
      : dateFromYmd(singleDate) ?? today;

  return {
    gate,
    singleDate,
    betweenStart,
    betweenEnd,
    betweenActive,
    relation,
    relativeAmount,
    relativeUnit,
    monthAnchor,
  };
};

export const FilterDateConditionPicker: React.FC<Props> = ({
  initialOperator,
  initialValue,
  onApply,
  onCancel,
}) => {
  const today = useMemo(() => asDateOnly(new Date()), []);
  const todayYmd = useMemo(() => toYMD(today), [today]);

  const initial = useMemo(
    () => extractInitialState(initialOperator, initialValue, today),
    [initialOperator, initialValue, today]
  );

  const [gate, setGate] = useState<DateGate>(initial.gate);
  const [singleDate, setSingleDate] = useState(initial.singleDate);
  const [betweenStart, setBetweenStart] = useState(initial.betweenStart);
  const [betweenEnd, setBetweenEnd] = useState(initial.betweenEnd);
  const [betweenActive, setBetweenActive] = useState<ActiveBetweenField>(initial.betweenActive);
  const [relation, setRelation] = useState<RelativeRelation>(initial.relation);
  const [relativeAmount, setRelativeAmount] = useState(initial.relativeAmount);
  const [relativeUnit, setRelativeUnit] = useState<RelativeUnit>(initial.relativeUnit);
  const [month, setMonth] = useState<Date>(initial.monthAnchor);
  const [hoveredYmd, setHoveredYmd] = useState<string | null>(null);
  const [showMonthMenu, setShowMonthMenu] = useState(false);
  const [showYearMenu, setShowYearMenu] = useState(false);

  const currentYear = today.getFullYear();
  const currentMonthIndex = today.getMonth();
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

  const effectiveRange = useMemo<RangeValue>(() => {
    if (gate === "between") {
      return normalizeBetween(betweenStart || todayYmd, betweenEnd || betweenStart || todayYmd, today);
    }
    if (gate === "relative") {
      return computeRelativeRange(relation, relativeAmount, relativeUnit, today);
    }
    const picked = clampToTodayYmd(singleDate || todayYmd, today);
    return { start: picked, end: picked };
  }, [betweenEnd, betweenStart, gate, relativeAmount, relativeUnit, relation, singleDate, today, todayYmd]);

  const previewRange = useMemo(() => {
    if (gate !== "between" || betweenActive !== "end") return null;
    if (!betweenStart || !hoveredYmd) return null;
    const hover = dateFromYmd(hoveredYmd);
    const startDate = dateFromYmd(betweenStart);
    if (!hover || !startDate) return null;
    if (isBefore(hover, startDate) || isAfter(hover, today)) return null;
    return { start: betweenStart, end: hoveredYmd };
  }, [betweenActive, betweenStart, gate, hoveredYmd, today]);

  const selectedStart = dateFromYmd(effectiveRange.start);
  const selectedEnd = dateFromYmd(effectiveRange.end);
  const previewStart = dateFromYmd(previewRange?.start);
  const previewEnd = dateFromYmd(previewRange?.end);

  const days = useMemo(() => {
    const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const gridStart = addDays(firstOfMonth, -firstOfMonth.getDay());
    return Array.from({ length: 42 }).map((_, idx) => addDays(gridStart, idx));
  }, [month]);

  const isDisabledDate = (value: Date) => {
    if (gate === "relative") return true;
    if (isAfter(value, today)) return true;
    if (gate === "between" && betweenActive === "end" && betweenStart) {
      const s = dateFromYmd(betweenStart);
      if (s && isBefore(value, s)) return true;
    }
    return false;
  };

  const onSelectDate = (ymd: string) => {
    const picked = dateFromYmd(ymd);
    if (!picked || isDisabledDate(picked)) return;

    if (gate === "between") {
      if (betweenActive === "start") {
        setBetweenStart(ymd);
        setBetweenEnd((prev) => (prev && prev >= ymd ? prev : ymd));
        setBetweenActive("end");
      } else {
        setBetweenEnd(ymd);
      }
      return;
    }

    setSingleDate(ymd);
  };

  const canApply =
    gate === "between"
      ? Boolean(betweenStart && betweenEnd)
      : gate === "relative"
      ? true
      : Boolean(singleDate);

  const handleApply = () => {
    if (!canApply) return;

    if (gate === "between") {
      const normalized = normalizeBetween(betweenStart, betweenEnd, today);
      onApply("between", [normalized.start, normalized.end]);
      return;
    }

    if (gate === "relative") {
      const range = computeRelativeRange(relation, relativeAmount, relativeUnit, today);
      onApply("relative", {
        direction: relation,
        unit: relativeUnit,
        amount: relativeAmount,
        start: range.start,
        end: range.end,
      });
      return;
    }

    onApply(gate, clampToTodayYmd(singleDate, today));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <div className="text-xs font-medium text-kk-dark-text">Date</div>
        <select
          className={`${toggleIconClass} w-full flex-1`}
          value={gate}
          onChange={(event) => {
            setGate(event.target.value as DateGate);
            setBetweenActive("start");
          }}
        >
          <option value="on">Is</option>
          <option value="between">Is between</option>
          <option value="relative">Is relative to today</option>
          <option value="before">Is before</option>
          <option value="after">Is after</option>
          <option value="on_or_before">Is on or before</option>
          <option value="on_or_after">Is on or after</option>
        </select>
      </div>

      {gate === "between" ? (
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            className={`rounded-md border px-1.5 py-1 text-left text-xs ${
              betweenActive === "start"
                ? "border-[#2d7dd2] bg-kk-dark-bg-elevated"
                : "border-kk-dark-input-border bg-kk-dark-bg"
            }`}
            onClick={() => setBetweenActive("start")}
          >
            {betweenStart ? dateLabel(betweenStart) : <span className="text-kk-dark-text-muted">Starting</span>}
          </button>
          <button
            type="button"
            className={`rounded-md border px-1.5 py-1 text-left text-xs ${
              betweenActive === "end"
                ? "border-[#2d7dd2] bg-kk-dark-bg-elevated"
                : "border-kk-dark-input-border bg-kk-dark-bg"
            }`}
            onClick={() => setBetweenActive("end")}
          >
            {betweenEnd ? dateLabel(betweenEnd) : <span className="text-kk-dark-text-muted">Ending</span>}
          </button>
        </div>
      ) : null}

      {gate === "relative" ? (
        <div className="flex items-center gap-1.5">
          <select
            className={`${toggleIconClass} min-w-0 flex-1`}
            value={relation}
            onChange={(event) => setRelation(event.target.value as RelativeRelation)}
          >
            <option value="past">Past</option>
            <option value="this">This</option>
          </select>

          {relation === "past" ? (
            <input
              type="number"
              min={1}
              value={relativeAmount}
              onChange={(event) => setRelativeAmount(Math.max(1, Math.floor(Number(event.target.value) || 1)))}
              className="w-14 rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-1.5 py-0.5 text-xs text-left"
            />
          ) : null}

          <select
            className={`${toggleIconClass} min-w-0 flex-1`}
            value={relativeUnit}
            onChange={(event) => setRelativeUnit(event.target.value as RelativeUnit)}
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
                      onClick={() => {
                        setMonth((prev) => new Date(prev.getFullYear(), monthIndex, 1));
                        setShowMonthMenu(false);
                      }}
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
                      onClick={() => {
                        setMonth((prev) => {
                          const nextMonthIndex =
                            year === currentYear ? Math.min(prev.getMonth(), currentMonthIndex) : prev.getMonth();
                          return new Date(year, nextMonthIndex, 1);
                        });
                        setShowYearMenu(false);
                      }}
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
            onClick={() => {
              setMonth(new Date(currentYear, currentMonthIndex, 1));
              setShowMonthMenu(false);
              setShowYearMenu(false);
            }}
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

      <div className="mt-2 flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-kk-dark-input-border px-2 py-1 text-xs text-kk-dark-text-muted hover:text-kk-dark-text"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!canApply}
          onClick={handleApply}
          className="rounded-md bg-[#2d7dd2] px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          Apply
        </button>
      </div>
    </div>
  );
};
