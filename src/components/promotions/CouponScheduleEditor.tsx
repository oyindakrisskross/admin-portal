import type { CouponSchedule, WeekDay } from "../../types/promotions";
import { DAY_CHOICES } from "../../types/promotions";

export type ScheduleRow = {
  weekday: WeekDay;
  enabled: boolean;
  id?: number;
  all_day: boolean;
  start_time: string;
  end_time: string;
};

type Props = {
  useSchedule: boolean;
  rows: ScheduleRow[];
  onChange: (next: { useSchedule: boolean; rows: ScheduleRow[] }) => void;
};

const weekdayLabel = (w: WeekDay) => DAY_CHOICES.find((d) => d.value === w)?.label ?? w;

export function buildScheduleRows(schedules?: CouponSchedule[] | null): ScheduleRow[] {
  const byDay = new Map<WeekDay, CouponSchedule>();
  (schedules ?? []).forEach((s) => {
    if (s.weekday) byDay.set(s.weekday, s);
  });

  return DAY_CHOICES.map(({ value }) => {
    const s = byDay.get(value);
    return {
      weekday: value,
      enabled: Boolean(s),
      id: s?.id,
      all_day: s?.all_day ?? true,
      start_time: (s?.start_time as any) ?? "",
      end_time: (s?.end_time as any) ?? "",
    };
  });
}

export function CouponScheduleEditor({ useSchedule, rows, onChange }: Props) {
  const patchRow = (weekday: WeekDay, patch: Partial<ScheduleRow>) => {
    onChange({
      useSchedule,
      rows: rows.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)),
    });
  };

  return (
    <section className="flex gap-6 py-7">
      <div className="w-2/3 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold">Scheduler</div>
          <label className="flex items-center gap-2 text-xs text-kk-dark-text-muted">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={useSchedule}
              onChange={(e) => onChange({ useSchedule: e.target.checked, rows })}
            />
            Use per-day schedule
          </label>
        </div>

        {!useSchedule ? (
          <div className="text-xs text-kk-dark-text-muted">
            No schedule set. Coupon is eligible any day/time (subject to start/end dates).
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-kk-dark-border">
            <table className="min-w-full">
              <thead className="bg-kk-dark-bg-elevated">
                <tr>
                  <th className="text-left px-3 py-2 text-xs">Day</th>
                  <th className="px-3 py-2 text-xs">Enabled</th>
                  <th className="px-3 py-2 text-xs">All Day</th>
                  <th className="text-left px-3 py-2 text-xs">Start</th>
                  <th className="text-left px-3 py-2 text-xs">End</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.weekday} className="border-t border-kk-dark-border">
                    <td className="px-3 py-2 text-xs">{weekdayLabel(r.weekday)}</td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        checked={r.enabled}
                        onChange={(e) => patchRow(r.weekday, { enabled: e.target.checked })}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        disabled={!r.enabled}
                        checked={r.all_day}
                        onChange={(e) => patchRow(r.weekday, { all_day: e.target.checked })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="time"
                        className="rounded-md border border-kk-dark-input-border px-2 py-1 text-xs"
                        disabled={!r.enabled || r.all_day}
                        value={r.start_time}
                        onChange={(e) => patchRow(r.weekday, { start_time: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="time"
                        className="rounded-md border border-kk-dark-input-border px-2 py-1 text-xs"
                        disabled={!r.enabled || r.all_day}
                        value={r.end_time}
                        onChange={(e) => patchRow(r.weekday, { end_time: e.target.value })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="w-1/3" />
    </section>
  );
}
