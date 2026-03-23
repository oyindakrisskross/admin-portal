// src/screens/reports/helpers.ts

import type { InvoiceResponse } from "./types/invoice";

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

const formatRangeDate = (value: Date) =>
  `${value.getDate()}/${value.getMonth() + 1}/${value.getFullYear()}`;

const endOfMonth = (value: Date) => new Date(value.getFullYear(), value.getMonth() + 1, 0);
const endOfYear = (value: Date) => new Date(value.getFullYear(), 11, 31);

export function isoToLabel(iso: string, granularity: "hour" | "day" | "week" | "month" | "year") {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  if (granularity === "hour") {
    return d.toLocaleString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      hour12: true,
    });
  }

  if (granularity === "day") {
    return d.toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "2-digit" });
  }

  if (granularity === "week") {
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    return `${formatRangeDate(d)}-${formatRangeDate(end)}`;
  }

  if (granularity === "month") {
    const end = endOfMonth(d);
    return `${formatRangeDate(d)}-${formatRangeDate(end)}`;
  }

  const end = endOfYear(d);
  return `${formatRangeDate(d)}-${formatRangeDate(end)}`;
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

export function humanizeStatus(value?: string, fallback = "") {
  const normalized = String(value || fallback || "").trim();
  if (!normalized) return "";
  return normalized
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (s) => s.toUpperCase());
}

export function getPrepaidDisplayStatus(
  invoice: Pick<InvoiceResponse, "type_id" | "status" | "prepaid_redeem_status" | "grand_total" | "amount_paid" | "balance_due">
) {
  if (String(invoice.type_id || "").toUpperCase() !== "PREPAID") {
    return String(invoice.status || "").toUpperCase();
  }

  const grandTotal = Number(invoice.grand_total ?? 0);
  const amountPaid = Number(invoice.amount_paid ?? 0);
  const balanceDueRaw = Number(invoice.balance_due ?? Math.max(grandTotal - amountPaid, 0));
  const balanceDue = Number.isFinite(balanceDueRaw) ? Math.max(balanceDueRaw, 0) : 0;

  if (balanceDue > 0.009) {
    return amountPaid > 0.009 ? "PARTIALLY_PAID" : "UNPAID";
  }

  return String(invoice.prepaid_redeem_status || "UNUSED").toUpperCase();
}
