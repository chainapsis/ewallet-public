---
title: Self-Hosting Guide
---

## Overview

This guide covers how to run each service locally or on servers and the
recommended boot order for a standalone setup. For prerequisites, build steps,
and tooling, see
[Development Setup](../development/environment-setup).

## Before you start

Self-hosting uses Docker images that are built locally, so you need a working
development setup before running any Docker Compose stacks. Make sure you
complete the prerequisites and build steps in
[Development Setup](../development/environment-setup) (Node/Yarn/Rust, install,
and `yarn ci build_pkgs` / `yarn ci build_cs` / `yarn ci build_frost`) before
continuing.

## Components (to run)

### keyshare node (`oko/key_share_node`)

Stores encrypted SSS shares of the user's first TSS share. Multiple nodes (2-3
recommended) each store one SSS share, ensuring no single node can reconstruct
the user's share. Provides these shares to users during login for
reconstruction.

### oko_api (`oko/backend/oko_api/server`)

The main API server that orchestrates the system. Stores the user's second TSS
share encrypted in its database. Performs distributed TSS transaction signing
with the client (which holds the first TSS share) without ever reconstructing
the full private key. Manages customer organizations, wallets, user accounts,
Google OAuth authentication, JWT token issuance, and provides REST APIs for
dashboards and admin functions.

### oko_attached (`oko/embed/oko_attached`)

Client-side web application running in an iframe that provides the user
interface for wallet operations. Handles key generation, manages the user's
first TSS share locally, and coordinates with `oko_api` for transaction signing.
Communicates with host applications via `postMessage` API to expose wallet
functionality.

### Apps (`oko/apps`)

- **demo_web**: A test application demonstrating how to integrate Oko wallet
  functionality into a dApp using the SDK
- **customer_dashboard**: A web interface for customers to manage their API
  keys, view usage statistics, and configure their organization settings
- **oko_admin_web**: An administrative interface for system administrators to
  manage customers, monitor key share nodes, configure system settings, and
  oversee the entire Oko infrastructure

## Default Ports (customizable)

- keyshare node: 4201 (node 1), 4202 (node 2), 4203 (node 3, optional)
- oko_api: 4200
- demo_web: 3200
- oko_attached: 3201
- customer_dashboard: 3203
- oko_admin_web: 3204

## keyshare node

Option A — Docker Compose (recommended)

```bash
cd oko/key_share_node/docker
cp env.example .env
```

1. **Prepare the encryption secret file:**

Create a secure encryption secret file at your desired location. This file will
be used to encrypt user key shares within the Key Share Node. **You can use any
random value you choose** - this will be referenced later in the
`ENCRYPTION_SECRET_FILE_PATH` environment variable.

**Create the encryption secret file:**

```bash
# Generate a random 32-byte (256-bit) encryption secret as hex and save it to a file
sudo mkdir -p /opt/key_share_node
openssl rand -hex 32 | tr -d '\n' | sudo tee /opt/key_share_node/encryption_secret.txt >/dev/null
```

2. **Create required directories and set proper permissions**:

```bash
# Create directories for data persistence
sudo mkdir -p /opt/key_share_node/pg_data /opt/key_share_node/dump /opt/key_share_node/logs

# Set proper permissions for Node.js user (UID:1000, GID:1000)
# DUMP_DIR and LOG_DIR must be writable by the container's Node.js user
sudo chown -R 1000:1000 /opt/key_share_node/dump /opt/key_share_node/logs
```

3. **Edit `.env` file** with your configuration:

```bash
# Database Configuration
DB_USER=postgres                    # PostgreSQL database username
DB_PASSWORD=your_secure_password    # PostgreSQL database password
DB_NAME=key_share_node              # PostgreSQL database name
PG_DATA_DIR=/opt/key_share_node/pg_data  # Host directory for PostgreSQL data persistence
DUMP_DIR=/opt/key_share_node/dump    # Host directory for database dump files (must be writable by UID:1000/GID:1000)
LOG_DIR=/opt/key_share_node/logs     # Host directory for log files (must be writable by UID:1000/GID:1000)

# Server Configuration
SERVER_PORT=4201                     # Port number for the Key Share Node server
ADMIN_PASSWORD=admin_password       # Admin password for database dump/restore operations
ENCRYPTION_SECRET_FILE_PATH=/opt/key_share_node/encryption_secret.txt  # Host file path to encryption secret
```

4. **Start the services**:

```bash
docker compose up -d
```

5. **Verify the services are running**:

```bash
docker compose ps
curl http://localhost:4201/status
```

Option B — Local (dev, multi-node)

```bash
cd oko
# Generate env files for nodes 1/2/3 under ~/.oko and a temp encryption secret file
yarn workspace @oko-wallet/key-share-node-server create_env

# PostgreSQL (example via Docker)
docker run --name ksnode-pg -p 5432:5432 -e POSTGRES_PASSWORD=postgres -d postgres:17

# Node 1 (port 4201)
yarn workspace @oko-wallet/key-share-node-server start
# Node 2 (port 4202)
yarn workspace @oko-wallet/key-share-node-server start_2
# (Optional) Node 3 (port 4203)
yarn workspace @oko-wallet/key-share-node-server start_3
```

Health check: `curl http://localhost:4201/status`

## oko_api (backend)

Option A — Docker Compose (recommended)

```
cd oko/internals/docker
cp env.example .env
```

1. **Edit `.env` file** with your configuration:

```bash
# Database Configuration
DB_USER=postgres                    # PostgreSQL database username
DB_PASSWORD=postgres                # PostgreSQL database password
DB_NAME=oko_dev                 # PostgreSQL database name
DB_PORT=5432                        # PostgreSQL database port
DB_SSL=false                        # Enable/disable SSL connection (true/false)
PG_DATA_DIR=./pg_data               # Host directory for PostgreSQL data persistence

# Server Configuration
SERVER_PORT=4200                    # Port number for the oko API server
JWT_SECRET=jwtsecret               # Secret key for JWT token signing
JWT_EXPIRES_IN=1H                   # JWT token expiration time

# SMTP Configuration (for email verification)
SMTP_HOST=smtp.gmail.com           # SMTP server hostname
SMTP_PORT=587                      # SMTP server port (587 for TLS, 465 for SSL)
SMTP_USER=no-reply@example.com     # SMTP authentication username
SMTP_PASS=your-app-password        # SMTP authentication password
FROM_EMAIL=no-reply@example.com     # Email address used as sender for verification emails
EMAIL_VERIFICATION_EXPIRATION_MINUTES=3  # Email verification code expiration time in minutes

# S3 Configuration (for customer data storage)
S3_REGION=ap-northeast-2           # AWS S3 region
S3_BUCKET=oko-wallet-customer      # AWS S3 bucket name
S3_ACCESS_KEY_ID=ID                # AWS S3 access key ID
S3_SECRET_ACCESS_KEY=SECRET_KEY     # AWS S3 secret access key

# Encryption Configuration
ENCRYPTION_SECRET=temp-enc-secret  # Secret key used to encrypt user shares (use a strong random value in production)

# Elasticsearch Configuration (optional, for logging)
ES_URL=                            # Elasticsearch URL (leave empty if not using)
ES_INDEX=index                     # Elasticsearch index name (optional)
ES_CLIENT_INDEX=client_index       # Elasticsearch client index name (optional)
ES_USERNAME=username               # Elasticsearch username (optional)
ES_PASSWORD=pw                     # Elasticsearch password (optional)
```

2. **Start the services**:

```bash
docker compose up -d
```

3. **Verify the services are running**:

```bash
docker compose ps
curl http://localhost:4200/
```

The database will be automatically migrated on first startup. For migration and
seeding commands, see
[Development Setup](../development/environment-setup).

Option B — Local (dev)

1. **Create environment file**:

```bash
cd oko
yarn workspace @oko-wallet/oko-api-server create_env
```

2. **Edit `~/.oko/oko_api_server.env` file** with your configuration:

```bash
# Server Configuration
SERVER_PORT=4200                    # Port number for the oko API server

# JWT Configuration
JWT_SECRET=jwtsecret               # Secret key for JWT token signing
JWT_EXPIRES_IN=1H                   # JWT token expiration time

# SMTP Configuration (for email verification)
SMTP_HOST=smtp.gmail.com           # SMTP server hostname
SMTP_PORT=587                      # SMTP server port (587 for TLS, 465 for SSL)
SMTP_USER=no-reply@example.com     # SMTP authentication username
SMTP_PASS=your-app-password        # SMTP authentication password
FROM_EMAIL=no-reply@example.com     # Email address used as sender for verification emails
EMAIL_VERIFICATION_EXPIRATION_MINUTES=3  # Email verification code expiration time in minutes

# S3 Configuration (for customer data storage)
S3_REGION=ap-northeast-2           # AWS S3 region
S3_BUCKET=oko-wallet-customer      # AWS S3 bucket name
S3_ACCESS_KEY_ID=ID                # AWS S3 access key ID
S3_SECRET_ACCESS_KEY=SECRET_KEY     # AWS S3 secret access key

# Database Configuration
DB_HOST=localhost                  # PostgreSQL database host
DB_PORT=5432                       # PostgreSQL database port
DB_USER=postgres                   # PostgreSQL database username
DB_PASSWORD=postgres               # PostgreSQL database password
DB_NAME=oko_dev                # PostgreSQL database name
DB_SSL=false                       # Enable/disable SSL connection (true/false)

# Encryption Configuration
ENCRYPTION_SECRET=temp-enc-secret  # Secret key used to encrypt user shares (use a strong random value in production)

# Elasticsearch Configuration (optional, for logging)
ES_URL=                            # Elasticsearch URL (leave empty if not using)
ES_INDEX=index                     # Elasticsearch index name (optional)
ES_CLIENT_INDEX=client_index       # Elasticsearch client index name (optional)
ES_USERNAME=username               # Elasticsearch username (optional)
ES_PASSWORD=pw                     # Elasticsearch password (optional)
```

3. **Migrate/seed database**:

See [Development Setup](../development/environment-setup) for migration and
seed commands.

4. **Run server**:

```bash
# Development mode
yarn workspace @oko-wallet/oko-api-server dev

# Production mode
# yarn workspace @oko-wallet/oko-api-server start
```

5. **Verify the server is running**:

```bash
# Health check
curl http://localhost:4200/

# API documentation
# Open in browser: http://localhost:4200/api_docs
```

## oko_attached (embedded app)

```bash
cd oko
# Create env under ~/.oko/oko_attached.env
yarn workspace @oko-wallet/oko-attached create_env
# Example values:
# SERVER_PORT=3201
# VITE_OKO_API_ENDPOINT=http://localhost:4200
# VITE_DEMO_WEB_ORIGIN=http://localhost:3200  # host app origin embedding the iframe

yarn workspace @oko-wallet/oko-attached dev
```

Open the printed dev URL. This is an independent app that runs inside an iframe
(not a traditional UI "widget"). The host app should iframe
`http://localhost:3201/` and pass a `host_origin` parameter for initialization.

## Apps (oko/apps)

### demo_web (for testing)

```bash
cd oko
yarn workspace @oko-wallet/demo-web create_env
# Example values:
# SERVER_PORT=3200
# NEXT_PUBLIC_OKO_SDK_ENDPOINT=http://localhost:3201  # oko_attached URL

yarn workspace @oko-wallet/demo-web dev
```

Open: `http://localhost:3200`

### customer_dashboard

```bash
cd oko
# Create ~/.oko/customer_dashboard.env
yarn workspace @oko-wallet/customer-dashboard create_env
# Example values:
# SERVER_PORT=3203
# NEXT_PUBLIC_OKO_API_ENDPOINT=http://localhost:4200

yarn workspace @oko-wallet/customer-dashboard dev
```

Open: `http://localhost:3203`

### oko_admin_web

```bash
cd oko
yarn workspace @oko-wallet/oko-admin-web create_env
# Example values:
# SERVER_PORT=3204
# NEXT_PUBLIC_OKO_API_ENDPOINT=http://localhost:4200

yarn workspace @oko-wallet/oko-admin-web dev
```

Open: `http://localhost:3204`

## Recommended Boot Order

1. Prepare PostgreSQL (keyshare node/oko_api)
2. Start keyshare node (≥ 2 nodes recommended; 3 nodes optional)
3. Migrate/seed oko_api → start oko_api (4200)
4. Start oko_attached (3201)
5. Start Apps (demo_web 3200, customer_dashboard 3203, oko_admin_web 3204)

## Troubleshooting

- Port conflicts: change ports in env files and restart
- SMTP: for local, use sandbox/dummy values (missing required fields can block
  server startup)
- CORS: oko_api allows all origins by default; restrict origins in production
- keyshare node permissions: with Docker, ensure `DUMP_DIR`/`LOG_DIR` are
  writable by UID 1000

## Production Tips

- Terminate TLS with a reverse proxy (Nginx/Caddy) and lock down allowed origins
- Multi-node keyshare node (e.g., 2-of-3), retain/monitor dump directory
- Strong secrets (ADMIN_PASSWORD, ENCRYPTION_SECRET, JWT_SECRET, etc.) and a
  secret manager (KMS/Secret Manager)
- Managed/dedicated Postgres with automated backups and recovery plan
