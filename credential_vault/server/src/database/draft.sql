-- 1. User and Authentication
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           CITEXT UNIQUE NOT NULL,
    -- phone_number    CITEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    status          VARCHAR(16)  DEFAULT 'active'
);

CREATE TABLE oauth_accounts (
    user_id       UUID NOT NULL,           
    provider      VARCHAR(32),
    provider_uid  VARCHAR(128),
    access_token  TEXT,
    refresh_token TEXT,
    token_expiry  TIMESTAMPTZ,
    PRIMARY KEY (user_id, provider)
);


-- To be handled by ewallet_api, probably?
CREATE TABLE sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL,
    jwt_id        UUID UNIQUE,
    device_fingerprint TEXT,
    created_at    TIMESTAMPTZ DEFAULT now(),
    expires_at    TIMESTAMPTZ
);

-- Excluded from MVP
CREATE TABLE sms_verifications (
    phone_number  CITEXT,
    nonce         CHAR(6),
    expires_at    TIMESTAMPTZ,
    verified_at   TIMESTAMPTZ,
    PRIMARY KEY (phone_number, nonce)
);

-- 2. Wallets and Key Fragments
CREATE TABLE wallets (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL,
    curve_type    VARCHAR(16), -- default: 'secp256k1'
    public_key    BYTEA UNIQUE,
    created_at    TIMESTAMPTZ DEFAULT now(),
    metadata      JSONB
);

CREATE TABLE key_shares (
    wallet_id     UUID NOT NULL,
    shard_type    VARCHAR(16), -- default: 'sss_gf8'
    enc_share     BYTEA,
    created_at    TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (wallet_id, shard_type)
);

-- To be handled by ewallet_api, probably? Managed with permissions
-- Committee login functionality also needs to be implemented in ewallet_api
CREATE TABLE committee_shards (
    id            BIGSERIAL PRIMARY KEY,
    committee_id  INT,
    -- wallet_id     UUID NOT NULL,
    -- enc_share     BYTEA,
    created_at    TIMESTAMPTZ DEFAULT now()
);

-- 3. TSS Sessions & Signatures: From here on, handled by ewallet_api
CREATE TABLE tss_sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id     UUID NOT NULL,
    tx_hash       VARCHAR(64),
    state         VARCHAR(16),
    threshold_req SMALLINT,
    created_at    TIMESTAMPTZ DEFAULT now(),
    completed_at  TIMESTAMPTZ
);

CREATE TABLE partial_signatures (
    session_id    UUID NOT NULL,
    node_id       INT,
    signature     BYTEA,
    received_at   TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (session_id, node_id)
);

-- 4. Audit and Security
CREATE TABLE audit_logs (
    id            BIGSERIAL PRIMARY KEY,
    actor_type    VARCHAR(16),
    actor_id      UUID,
    action        VARCHAR(64),
    details       JSONB,
    ip_address    INET,
    created_at    TIMESTAMPTZ DEFAULT now()
);
