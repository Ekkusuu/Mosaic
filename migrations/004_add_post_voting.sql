-- Migration: Add voting system to posts and comments
-- Replace likes/shares with upvotes/downvotes

-- Add new columns to post table
ALTER TABLE post ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0;
ALTER TABLE post ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0;
ALTER TABLE post ADD COLUMN IF NOT EXISTS voted_by TEXT DEFAULT '{}';

-- Add new columns to comment table
ALTER TABLE comment ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0;
ALTER TABLE comment ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0;
ALTER TABLE comment ADD COLUMN IF NOT EXISTS voted_by TEXT DEFAULT '{}';

-- Migrate existing likes to upvotes
UPDATE post SET upvotes = likes WHERE likes IS NOT NULL;
UPDATE comment SET upvotes = likes WHERE likes IS NOT NULL;

-- Migrate liked_by to voted_by format (convert array to object with 'up' values)
-- This is a simplified migration - existing likes become upvotes
UPDATE post SET voted_by = REPLACE(REPLACE(REPLACE(liked_by, '[', '{'), ']', '}'), ',', ':"up",') || ':"up"}'
WHERE liked_by IS NOT NULL AND liked_by != '[]';
UPDATE post SET voted_by = '{}' WHERE voted_by IS NULL OR voted_by = '[]' OR voted_by = ':"up"}';

UPDATE comment SET voted_by = REPLACE(REPLACE(REPLACE(liked_by, '[', '{'), ']', '}'), ',', ':"up",') || ':"up"}'
WHERE liked_by IS NOT NULL AND liked_by != '[]';
UPDATE comment SET voted_by = '{}' WHERE voted_by IS NULL OR voted_by = '[]' OR voted_by = ':"up"}';

-- Create postviewlog table for rate-limited views
CREATE TABLE IF NOT EXISTS postviewlog (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES post(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id)
);

-- Drop old columns (optional - can be done in a later migration after verification)
-- ALTER TABLE post DROP COLUMN IF EXISTS likes;
-- ALTER TABLE post DROP COLUMN IF EXISTS shares;
-- ALTER TABLE post DROP COLUMN IF EXISTS liked_by;
-- ALTER TABLE comment DROP COLUMN IF EXISTS likes;
-- ALTER TABLE comment DROP COLUMN IF EXISTS liked_by;
