CREATE TABLE friendships (
    id BIGSERIAL PRIMARY KEY,
    requester_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT chk_friendship_not_self CHECK (requester_id <> recipient_id),
    CONSTRAINT chk_friendship_status CHECK (status IN ('PENDING', 'ACCEPTED'))
);

-- One row represents a pair regardless of which user sent the request first.
CREATE UNIQUE INDEX uq_friendships_pair
    ON friendships (LEAST(requester_id, recipient_id), GREATEST(requester_id, recipient_id));
CREATE INDEX idx_friendships_recipient_pending
    ON friendships (recipient_id, status, created_at);
CREATE INDEX idx_friendships_requester_status
    ON friendships (requester_id, status);
