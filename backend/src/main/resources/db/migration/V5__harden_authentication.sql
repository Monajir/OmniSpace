-- Normalize the canonical login identity before enforcing it in PostgreSQL.
UPDATE users SET email = LOWER(BTRIM(email));

CREATE UNIQUE INDEX ux_users_email_lower ON users(LOWER(email));

-- Token hashes are generated from 512 bits of randomness and must identify
-- exactly one row during locked rotation.
DROP INDEX IF EXISTS idx_refresh_token_hash;
CREATE UNIQUE INDEX ux_refresh_token_hash ON refresh_tokens(token_hash);

ALTER TABLE users
    ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- The documented bootstrap account uses a published initial password.
UPDATE users
SET must_change_password = TRUE
WHERE email = 'admin@omnispace.local';
