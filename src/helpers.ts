// src/screens/reports/helpers.ts

export function formatMoneyNGN(v: number) {
  return new Intl.NumberFormat("en-NG", { 
    style: "currency", 
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(v);
}

export function formatNumber(v: number) {
  return new Intl.NumberFormat("en-NG").format(v);
}

export function toYMD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function isoToLabel(iso: string, granularity: "hour" | "day" | "week" | "month") {
  const d = new Date(iso);
  if (granularity === "hour") {
    return d.toLocaleString("en-NG", { year: "numeric", month: "short" , day: "numeric", hour: "numeric", hour12: true });
  }
  return d.toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "2-digit" });
}

export function csvEscape(value: any) {
  const s = value === null || value === undefined ? "" : String(value);
  // Wrap in quotes if it contains comma, quote, or newline; escape quotes by doubling
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadCsv(filename: string, csvText: string) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function makeFilename(
  locationIds: number[] | "ALL", 
  start: string, 
  end: string, 
  itemsMode: string = ""
) {
  // example: variations_2025-09-01_to_2025-09-30_parents_ALL.csv
  const loc =
    locationIds === "ALL" ? "ALL" : `loc_${locationIds.join("-")}`;
  return `variations_${start}_to_${end}_${itemsMode}_${loc}.csv`;
}

export function toDateStr (str: string) {
  const date = new Date(str);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toDateStrShort (str: string) {
  const date = new Date(str);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}