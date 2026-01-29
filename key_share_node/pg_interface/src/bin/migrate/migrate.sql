-- public.2_key_shares definition

-- Drop table

-- DROP TABLE public."2_key_shares";

CREATE TABLE public."2_key_shares" (
	share_id uuid DEFAULT gen_random_uuid() NOT NULL,
	wallet_id uuid NOT NULL,
	enc_share bytea NOT NULL,
	status varchar NOT NULL,
	reshared_at timestamptz DEFAULT now() NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	aux jsonb NULL,
	CONSTRAINT "2_key_shares_pkey" PRIMARY KEY (share_id),
	CONSTRAINT "2_key_shares_unique" UNIQUE (wallet_id)
);


-- public.2_pg_dumps definition

-- Drop table

-- DROP TABLE public."2_pg_dumps";

CREATE TABLE public."2_pg_dumps" (
	dump_id uuid DEFAULT gen_random_uuid() NOT NULL,
	status varchar(16) NOT NULL,
	dump_path varchar(255) NULL,
	meta jsonb NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "2_pg_dumps_pkey" PRIMARY KEY (dump_id)
);


-- public.2_users definition

-- Drop table

-- DROP TABLE public."2_users";

CREATE TABLE public."2_users" (
	user_id uuid DEFAULT gen_random_uuid() NOT NULL,
	auth_type varchar(64) NOT NULL,
	user_auth_id varchar(255) NOT NULL,
	status varchar(16) DEFAULT 'active'::character varying NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	aux jsonb NULL,
	CONSTRAINT "2_users_pkey" PRIMARY KEY (user_id),
	CONSTRAINT "2_users_auth_type_user_auth_id_key" UNIQUE (auth_type, user_auth_id)
);


-- public.2_wallets definition

-- Drop table

-- DROP TABLE public."2_wallets";

CREATE TABLE public."2_wallets" (
	wallet_id uuid DEFAULT gen_random_uuid() NOT NULL,
	user_id uuid NOT NULL,
	curve_type varchar(16) NOT NULL,
	public_key bytea NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	aux jsonb NULL,
	CONSTRAINT "2_wallets_pkey" PRIMARY KEY (wallet_id),
	CONSTRAINT "2_wallets_public_key_key" UNIQUE (public_key)
);


-- public.2_server_keypairs definition

-- Drop table

-- DROP TABLE public."2_server_keypairs";

CREATE TABLE public."2_server_keypairs" (
	keypair_id uuid DEFAULT gen_random_uuid() NOT NULL,
	version int4 GENERATED ALWAYS AS IDENTITY NOT NULL,
	public_key bytea NOT NULL,
	enc_private_key text NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	rotated_at timestamptz NULL,
	CONSTRAINT "2_server_keypairs_pkey" PRIMARY KEY (keypair_id),
	CONSTRAINT "2_server_keypairs_version_key" UNIQUE (version)
);
CREATE INDEX idx_2_server_keypairs_is_active ON public."2_server_keypairs" USING btree (is_active) WHERE (is_active = true);


-- public.2_commit_reveal_sessions definition

-- Drop table

-- DROP TABLE public."2_commit_reveal_sessions";

CREATE TABLE public."2_commit_reveal_sessions" (
	session_id uuid NOT NULL,
	operation_type varchar(32) NOT NULL,
	client_ephemeral_pubkey bytea NOT NULL,
	id_token_hash varchar(64) NOT NULL,
	state varchar(16) DEFAULT 'COMMITTED'::character varying NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	expires_at timestamptz NOT NULL,
	CONSTRAINT "2_commit_reveal_sessions_pkey" PRIMARY KEY (session_id),
	CONSTRAINT "2_cr_sessions_client_pubkey_key" UNIQUE (client_ephemeral_pubkey),
	CONSTRAINT "2_cr_sessions_id_token_hash_key" UNIQUE (id_token_hash)
);
CREATE INDEX idx_2_cr_sessions_state ON public."2_commit_reveal_sessions" USING btree (state);
CREATE INDEX idx_2_cr_sessions_expires_at ON public."2_commit_reveal_sessions" USING btree (expires_at);


-- public.2_commit_reveal_api_calls definition

-- Drop table

-- DROP TABLE public."2_commit_reveal_api_calls";

CREATE TABLE public."2_commit_reveal_api_calls" (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	session_id uuid NOT NULL,
	api_name varchar(64) NOT NULL,
	signature bytea NOT NULL,
	called_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "2_commit_reveal_api_calls_pkey" PRIMARY KEY (id),
	CONSTRAINT "2_cr_api_calls_signature_key" UNIQUE (signature),
	CONSTRAINT "2_cr_api_calls_session_api_key" UNIQUE (session_id, api_name)
);
CREATE INDEX idx_2_cr_api_calls_session_id ON public."2_commit_reveal_api_calls" USING btree (session_id);
