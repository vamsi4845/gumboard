-- CreateIndex: Add indexes for query optimization
-- This migration adds composite indexes to improve performance for common query patterns

-- Index for boards by organization, ordered by creation date (dashboard queries)
CREATE INDEX IF NOT EXISTS "idx_boards_org_createdat" 
ON "boards" ("organizationId", "createdAt" DESC);

-- Index for notes within a board, filtered by deletion status, ordered by creation date
CREATE INDEX IF NOT EXISTS "idx_notes_board_active_createdat" 
ON "notes" ("boardId", "deletedAt", "createdAt" DESC);

-- Index for organization invites by organization and status, ordered by creation date
CREATE INDEX IF NOT EXISTS "idx_invites_org_status_createdat" 
ON "organization_invites" ("organizationId", "status", "createdAt" DESC);
