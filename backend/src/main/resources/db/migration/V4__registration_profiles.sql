ALTER TABLE organizations ADD COLUMN IF NOT EXISTS inn VARCHAR(12);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ogrn VARCHAR(15);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS kpp VARCHAR(9);

CREATE UNIQUE INDEX IF NOT EXISTS uq_organizations_inn ON organizations (inn) WHERE inn IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_organizations_ogrn ON organizations (ogrn) WHERE ogrn IS NOT NULL;
