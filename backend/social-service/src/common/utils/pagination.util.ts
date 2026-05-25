export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function getPaginationParams(query: Record<string, any>): PaginationParams {
  const page  = Math.max(1, parseInt(query.page  as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

export function paginationMeta(page: number, limit: number, total?: number) {
  return {
    page,
    limit,
    ...(total !== undefined ? { total, totalPages: Math.ceil(total / limit) } : {}),
  };
}
