import type { Category } from "../types/catalog";

export type CategoryTreeOption = {
  id: number;
  label: string;
  depth: number;
  parentId: number | null;
};

export type CategoryTree = {
  options: CategoryTreeOption[];
  descendantsById: Record<number, number[]>;
};

function safeId(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function buildCategoryTree(categories: Category[]): CategoryTree {
  const byId = new Map<number, Category>();
  const childrenByParent = new Map<number | null, number[]>();

  for (const c of categories ?? []) {
    const id = safeId(c?.id);
    if (!id) continue;
    byId.set(id, c);

    const parentId = safeId(c.parent_id) ?? null;
    const arr = childrenByParent.get(parentId) ?? [];
    arr.push(id);
    childrenByParent.set(parentId, arr);
  }

  // Treat items whose parent isn't present as root nodes.
  for (const [id, c] of byId.entries()) {
    const parentId = safeId(c.parent_id);
    if (parentId && !byId.has(parentId)) {
      const arr = childrenByParent.get(null) ?? [];
      if (!arr.includes(id)) arr.push(id);
      childrenByParent.set(null, arr);
    }
  }

  const sortIdsByName = (ids: number[]) =>
    ids.sort((a, b) => {
      const an = String(byId.get(a)?.name ?? "").toLowerCase();
      const bn = String(byId.get(b)?.name ?? "").toLowerCase();
      return an.localeCompare(bn) || a - b;
    });

  for (const [k, ids] of childrenByParent.entries()) {
    childrenByParent.set(k, sortIdsByName(ids));
  }

  const options: CategoryTreeOption[] = [];
  const descendantsById: Record<number, number[]> = {};

  const collectDescendants = (id: number): number[] => {
    if (descendantsById[id]) return descendantsById[id];
    const out: number[] = [];
    const kids = childrenByParent.get(id) ?? [];
    for (const childId of kids) {
      out.push(childId, ...collectDescendants(childId));
    }
    descendantsById[id] = out;
    return out;
  };

  const visited = new Set<number>();
  const walk = (id: number, depth: number) => {
    if (visited.has(id)) return;
    visited.add(id);

    const c = byId.get(id);
    if (!c) return;
    options.push({
      id,
      label: String(c.name ?? `Category #${id}`),
      depth,
      parentId: safeId(c.parent_id) ?? null,
    });

    const kids = childrenByParent.get(id) ?? [];
    for (const childId of kids) {
      walk(childId, depth + 1);
    }
  };

  const roots = childrenByParent.get(null) ?? [];
  for (const id of roots) walk(id, 0);
  // In case there are disconnected nodes, include them too.
  for (const id of sortIdsByName(Array.from(byId.keys()))) walk(id, 0);

  for (const id of byId.keys()) collectDescendants(id);

  return { options, descendantsById };
}

