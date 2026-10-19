CREATE TABLE IF NOT EXISTS organization_subscriptions (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_org_subscriptions_organization
    ON organization_subscriptions (organization_id);
