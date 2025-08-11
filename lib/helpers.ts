// Helper functions for database operations and common patterns

/**
 * Common where clause for active (non-deleted) notes
 */
export const activeNoteWhere = (extra: any = {}) => ({
  deletedAt: null,
  ...extra,
});

/**
 * Get note count for a board (can be cached)
 * Use this instead of _count queries on hot paths
 */
export async function getBoardNoteCounts(boardIds: string[], db: any) {
  if (boardIds.length === 0) return {};
  
  const counts = await db.note.groupBy({
    by: ['boardId'],
    where: {
      boardId: { in: boardIds },
      deletedAt: null,
    },
    _count: { _all: true },
  });
  
  // Convert to map with default 0 for boards with no notes
  const countMap: Record<string, number> = {};
  boardIds.forEach(id => countMap[id] = 0);
  counts.forEach((c: any) => {
    countMap[c.boardId] = c._count._all;
  });
  
  return countMap;
}
