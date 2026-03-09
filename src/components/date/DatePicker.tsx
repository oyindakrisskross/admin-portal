import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toYMD } from "../../helpers";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const asDateOnly = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

export const parseYmd = (value?: string | null) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
};

const addDays = (value: Date, days: number) => {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
};

const shiftMonths = (value: Date, months: number) => {
  const next = new Date(value.getFullYear(), value.getMonth(), 1);
  next.setMonth(next.getMonth() + months);
  return next;
};

const isSameDay = (a?: Date | null, b?: Date | null) => {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
};

const isBetweenInclusive = (value: Date, start?: Date | null, end?: Date | null) => {
  if (!start || !end) return false;
  const cur = asDateOnly(value).getTime();
  const lo = asDateOnly(start).getTime();
  const hi = asDateOnly(end).getTime();
  return cur >= Math.min(lo, hi) && cur <= Math.max(lo, hi);
};

const monthLabel = (value: Date) =>
  value.toLocaleDateString("en-NG", { month: "long", year: "numeric" });

const dateLabel = (value?: string | null) => {
  const dt = parseYmd(value);
  if (!dt) return "";
  return dt.toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
};

export interface CalendarGridProps {
  month: Date;
  onMonthChange: (next: Date) => void;
  selectedDate?: string | null;
  rangeStart?: string | null;
  rangeEnd?: string | null;
  onSelectDate?: (value: string) => void;
  footerText?: string;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  month,
  onMonthChange,
  selectedDate,
  rangeStart,
  rangeEnd,
  onSelectDate,
  footerText,
}) => {
  const selected = parseYmd(selectedDate);
  const start = parseYmd(rangeStart);
  const end = parseYmd(rangeEnd);

  const days = useMemo(() => {
    const firstDayOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const gridStart = addDays(firstDayOfMonth, -firstDayOfMonth.getDay());
    return Array.from({ length: 42 }).map((_, idx) => addDays(gridStart, idx));
  }, [month]);

  return (
    <div className="rounded-xl border border-kk-dark-input-border bg-kk-dark-bg-elevated p-3 shadow-xl">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-kk-dark-text">{monthLabel(month)}</div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMonthChange(shiftMonths(month, -1))}
            className="rounded-md border border-kk-dark-input-border p-1 text-kk-dark-text-muted hover:text-kk-dark-text"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(shiftMonths(month, 1))}
            className="rounded-md border border-kk-dark-input-border p-1 text-kk-dark-text-muted hover:text-kk-dark-text"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-kk-dark-text-muted">
        {WEEKDAY_LABELS.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inMonth = day.getMonth() === month.getMonth();
          const inRange = isBetweenInclusive(day, start, end);
          const isSelected = isSameDay(day, selected) || isSameDay(day, start) || isSameDay(day, end);
          const cls = [
            "h-9 rounded-md text-sm transition-colors",
            inMonth ? "text-kk-dark-text" : "text-kk-dark-text-muted/60",
            inRange ? "bg-[#2a4f77]" : "bg-transparent",
            isSelected ? "bg-[#2d7dd2] text-white font-semibold" : "",
            onSelectDate ? "hover:bg-kk-dark-hover" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={toYMD(day)}
              type="button"
              disabled={!onSelectDate}
              onClick={() => onSelectDate?.(toYMD(day))}
              className={cls}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      {footerText ? (
        <div className="mt-3 border-t border-kk-dark-input-border pt-2 text-xs text-kk-dark-text-muted">
          {footerText}
        </div>
      ) : null}
    </div>
  );
};

interface DatePickerInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rangeStart?: string;
  rangeEnd?: string;
}

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  value,
  onChange,
  placeholder = "Select date",
  className,
  rangeStart,
  rangeEnd,
}) => {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(() => parseYmd(value) ?? new Date());
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const next = parseYmd(value);
    if (next) setMonth(new Date(next.getFullYear(), next.getMonth(), 1));
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={[
          "w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-left text-sm",
          className ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {dateLabel(value) || <span className="text-kk-dark-text-muted">{placeholder}</span>}
      </button>

      {open ? (
        <div className="absolute z-50 mt-2">
          <CalendarGrid
            month={month}
            onMonthChange={setMonth}
            selectedDate={value}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onSelectDate={(nextValue) => {
              onChange(nextValue);
              setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
};

