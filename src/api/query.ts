import type { FilterSet } from "../types/filters";

type QueryParamRecord = Record<string, unknown>;

function serializeQueryValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(",");
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return value == null ? "" : String(value);
}

export function buildQueryPath(
  path: string,
  options?: {
    params?: QueryParamRecord;
    filters?: FilterSet;
  }
): string {
  const search = new URLSearchParams();

  if (options?.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value === undefined || value === null || value === "") continue;
      search.set(key, serializeQueryValue(value));
    }
  }

  if (options?.filters) {
    options.filters.clauses.forEach((clause) => {
      search.append(
        "filter",
        `${clause.field}|${clause.operator}|${serializeQueryValue(clause.value)}`
      );
    });
  }

  return search.toString() ? `${path}?${search.toString()}` : path;
}
