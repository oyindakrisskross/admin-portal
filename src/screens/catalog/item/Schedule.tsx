import React, { useEffect, useMemo, useState } from "react";
import { fetchItem } from "../../../api/catalog";
import type { Item, ItemSchedule, WeekDay } from "../../../types/catalog";

interface Props {
  itemId: number;
}

const WEEKDAY_ORDER: WeekDay[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const WEEKDAY_LABEL: Record<WeekDay, string> = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
  SUN: "Sunday",
};

function formatTimeRange(s: ItemSchedule): string {
  if (s.all_day) return "All day";
  if (!s.time_from || !s.time_to) return "—";
  return `${s.time_from} – ${s.time_to}`;
}

export const Schedule: React.FC<Props> = ({ itemId }) => {
  const [item, setItem] = useState<Item | null>(null);

  useEffect(() => {
    (async () => {
      const data = await fetchItem(itemId);
      setItem(data);
    })();
  }, [itemId]);

  const schedules = useMemo(() => {
    const list = item?.schedules ?? [];
    return [...list].sort((a, b) => {
      const ai = WEEKDAY_ORDER.indexOf(a.weekday);
      const bi = WEEKDAY_ORDER.indexOf(b.weekday);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [item?.schedules]);

  if (!item) {
    return (
      <div className="text-xs text-kk-dark-text-muted">Loading schedule…</div>
    );
  }

  if (!item.scheduled) {
    return (
      <div className="text-xs text-kk-dark-text-muted">
        This item is not scheduled.
      </div>
    );
  }

  return (
    <div>
      <table className="min-w-full">
        <thead>
          <tr>
            <th className="text-left">Day</th>
            <th className="text-left">Time</th>
          </tr>
        </thead>
        <tbody>
          {schedules.map((s) => (
            <tr key={s.id ?? `${s.weekday}-${s.time_from ?? ""}-${s.time_to ?? ""}`}>
              <td>{WEEKDAY_LABEL[s.weekday]}</td>
              <td>{formatTimeRange(s)}</td>
            </tr>
          ))}

          {!schedules.length && (
            <tr>
              <td
                colSpan={2}
                className="px-3 py-10 text-center text-xs text-kk-dark-text-muted"
              >
                No schedule configured.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

