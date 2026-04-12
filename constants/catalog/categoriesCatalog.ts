import type { AxiosInstance } from "axios";
import type { Product } from "@/assets/types/product";

/** One row from GET /api/categories (possibly nested under `children`). */
export type CategoryRow = {
  _id: string;
  name: string;
  slug?: string;
  parent: string | null;
  children?: CategoryRow[];
};

/** Parent (or sub) category shown once in UI; `matchingCategoryIds` lists all backend ids with the same slug across orgs. */
export type DisplayCategory = CategoryRow & {
  matchingCategoryIds: string[];
};

export function normalizeCategoryKey(c: Pick<CategoryRow, "slug" | "name">): string {
  const raw = (c.slug || c.name || "").trim();
  return raw.toLowerCase().replace(/\s+/g, "-");
}

/** Accepts axios body: array, or `{ data: ... }`, etc. */
export function extractCategoriesArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const d = payload as Record<string, unknown>;
    if (Array.isArray(d.data)) return d.data;
    if (Array.isArray(d.categories)) return d.categories;
  }
  return [];
}

export function flattenCategoryTree(nodes: CategoryRow[]): CategoryRow[] {
  const out: CategoryRow[] = [];
  const walk = (list: CategoryRow[]) => {
    list.forEach((node) => {
      const { children, ...rest } = node;
      out.push(rest);
      if (children?.length) walk(children);
    });
  };
  walk(nodes);
  return out;
}

export function dedupeCategoriesBySlug(rows: CategoryRow[]): DisplayCategory[] {
  const map = new Map<string, DisplayCategory>();
  for (const c of rows) {
    const key = normalizeCategoryKey(c);
    if (!key) continue;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ...c,
        slug: c.slug || key,
        matchingCategoryIds: [c._id],
      });
    } else {
      if (!existing.matchingCategoryIds.includes(c._id)) {
        existing.matchingCategoryIds.push(c._id);
      }
    }
  }
  return Array.from(map.values());
}

export async function fetchCategoryCatalog(client: AxiosInstance): Promise<{
  flatAll: CategoryRow[];
  mergedParents: DisplayCategory[];
}> {
  const res = await client.get("/api/categories");
  const raw = extractCategoriesArray(res.data) as CategoryRow[];
  const flat = flattenCategoryTree(raw);
  const roots = flat.filter((c) => c.parent == null || c.parent === "");
  const mergedParents = dedupeCategoriesBySlug(roots);
  return { flatAll: flat, mergedParents };
}

export async function fetchMergedSubcategories(
  client: AxiosInstance,
  parent: DisplayCategory
): Promise<DisplayCategory[]> {
  const rows: CategoryRow[] = [];
  for (const pid of parent.matchingCategoryIds) {
    try {
      const res = await client.get(`/api/categories/${pid}/subcategories`);
      const arr = extractCategoriesArray(res.data) as CategoryRow[];
      rows.push(...arr);
    } catch {
      /* ignore per-org failures */
    }
  }
  return dedupeCategoriesBySlug(rows);
}

/** Merge all backend rows that share the same slug under the same parent (cross-organization). */
export function sameDisplayCategory(
  a: DisplayCategory | null,
  b: DisplayCategory | null
): boolean {
  if (!a || !b) return false;
  return (
    normalizeCategoryKey(a) === normalizeCategoryKey(b) &&
    String(a.parent ?? "") === String(b.parent ?? "")
  );
}

export function mergeCategoryRow(row: CategoryRow, flat: CategoryRow[]): DisplayCategory {
  const key = normalizeCategoryKey(row);
  const same = flat.filter(
    (c) =>
      normalizeCategoryKey(c) === key &&
      String(c.parent ?? "") === String(row.parent ?? "")
  );
  const d = dedupeCategoriesBySlug(same);
  return d[0] ?? { ...row, matchingCategoryIds: [row._id] };
}

export function productMatchesDisplayCategory(
  product: Product,
  selected: DisplayCategory
): boolean {
  const idSet = new Set(selected.matchingCategoryIds.map(String));
  const cat = product.category;
  if (typeof cat === "object" && cat && "_id" in cat) {
    if (idSet.has(String((cat as { _id: string })._id))) return true;
    const slug = (cat as { slug?: string }).slug;
    if (slug && normalizeCategoryKey({ slug, name: slug }) === normalizeCategoryKey(selected)) {
      return true;
    }
  } else if (typeof cat === "string") {
    if (idSet.has(String(cat))) return true;
  }
  return false;
}
