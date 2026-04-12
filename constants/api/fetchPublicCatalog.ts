import type { AxiosInstance } from "axios";
import type { Product } from "@/assets/types/product";

const PAGE_LIMIT = 50;

/**
 * Loads every page from GET /api/products/public (marketplace when no org header).
 */
export async function fetchAllPublicProducts(
  client: AxiosInstance
): Promise<Product[]> {
  const out: Product[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await client.get("/api/products/public", {
      params: { page, limit: PAGE_LIMIT },
    });
    const chunk = res.data?.data ?? res.data ?? [];
    if (Array.isArray(chunk)) out.push(...chunk);
    totalPages = Number(res.data?.totalPages) || 1;
    page += 1;
  } while (page <= totalPages);
  return out;
}
