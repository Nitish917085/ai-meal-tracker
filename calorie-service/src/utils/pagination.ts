import type { Pagination } from '../types';

export interface PageQuery {
  page: number;
  pageSize: number;
  offset: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Parse and clamp pagination query parameters.
 * Expects `page` and `pageSize` to come from `req.query` (strings | undefined).
 */
export function parsePagination(query: {
  page?: unknown;
  pageSize?: unknown;
}): PageQuery {
  const page = clampInt(Number(query.page), 1, Number.MAX_SAFE_INTEGER, 1);
  const pageSize = clampInt(Number(query.pageSize), 1, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE);
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function buildPagination(page: number, pageSize: number, total: number): Pagination {
  return {
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.trunc(value), min), max);
}
