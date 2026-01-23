-- Migration: Add views, upvotes, downvotes, and voted_by columns to note table
-- Also adds note_view_log table for rate-limited view tracking
-- Created: 2026-01-22

-- Add views column to note table
ALTER TABLE note ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0;

-- Add upvotes column to note table
ALTER TABLE note ADD COLUMN IF NOT EXISTS upvotes INTEGER NOT NULL DEFAULT 0;

-- Add downvotes column to note table
ALTER TABLE note ADD COLUMN IF NOT EXISTS downvotes INTEGER NOT NULL DEFAULT 0;

-- Add voted_by column to note table (stores JSON object: {"user_id": "up"|"down", ...})
ALTER TABLE note ADD COLUMN IF NOT EXISTS voted_by TEXT NOT NULL DEFAULT '{}';

-- Drop old likes/liked_by columns if they exist (optional, for cleanup)
-- ALTER TABLE note DROP COLUMN IF EXISTS likes;
-- ALTER TABLE note DROP COLUMN IF EXISTS liked_by;

-- Create note_view_log table for rate-limited view tracking
CREATE TABLE IF NOT EXISTS noteviewlog (
    id SERIAL PRIMARY KEY,
    note_id INTEGER NOT NULL REFERENCES note(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_noteviewlog_note_id ON noteviewlog(note_id);
CREATE INDEX IF NOT EXISTS idx_noteviewlog_user_id ON noteviewlog(user_id);
CREATE INDEX IF NOT EXISTS idx_noteviewlog_viewed_at ON noteviewlog(viewed_at);
