export type SortDir = "asc" | "desc";

export type SortState<K extends string> = {
  key: K;
  dir: SortDir;
};

export function nextSort<K extends string>(
  prev: SortState<K> | null,
  key: K
): SortState<K> {
  if (!prev || prev.key !== key) return { key, dir: "asc" };
  return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
}

export function sortIndicator<K extends string>(
  sort: SortState<K> | null,
  key: K
): string {
  if (!sort || sort.key !== key) return "";
  return sort.dir === "asc" ? " ▲" : " ▼";
}

function isNil(v: unknown) {
  return v === null || v === undefined || v === "";
}

function toNumberIfNumeric(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function compareValues(a: unknown, b: unknown): number {
  if (isNil(a) && isNil(b)) return 0;
  if (isNil(a)) return 1;
  if (isNil(b)) return -1;

  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();

  const na = toNumberIfNumeric(a);
  const nb = toNumberIfNumeric(b);
  if (na !== null && nb !== null) return na - nb;

  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);

  const sa = String(a).toLowerCase();
  const sb = String(b).toLowerCase();
  return sa.localeCompare(sb, undefined, { numeric: true, sensitivity: "base" });
}

export function sortBy<T, K extends string>(
  rows: T[],
  sort: SortState<K> | null,
  accessors: Record<K, (row: T) => unknown>
): T[] {
  if (!sort) return rows;
  const accessor = accessors[sort.key];
  if (!accessor) return rows;

  const mul = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((ra, rb) => mul * compareValues(accessor(ra), accessor(rb)));
}

