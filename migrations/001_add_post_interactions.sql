ALTER TABLE post ADD COLUMN IF NOT EXISTS shares INTEGER DEFAULT 0;

ALTER TABLE post ADD COLUMN IF NOT EXISTS liked_by VARCHAR(10000) DEFAULT '[]';

DROP TABLE IF EXISTS comment CASCADE;

CREATE TABLE comment (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES post(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    user_name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comment_post_id ON comment(post_id);

CREATE INDEX idx_comment_user_id ON comment(user_id);

CREATE INDEX idx_comment_created_at ON comment(created_at DESC);
