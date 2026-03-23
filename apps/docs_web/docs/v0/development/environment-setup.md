---
title: Development Setup
sidebar_position: 1
---

## Overview

This guide covers prerequisites, local setup, and common development tooling.
For running services, see
[Self-Hosting Guide](../standalone/self-hosting-standalone).

## Prerequisites

- OS: Oko supports only Linux/macOS. On Windows, use WSL2.
- Node 22 + Yarn 4
- Rust toolchain (via rustup)
- Docker + Docker Compose (recommended for keyshare node in production)
- PostgreSQL 17+ (non-Docker setups only; separate DBs for keyshare node and
  oko_api; or separate DB names on the same server)
- Build tools for native Node addons (make, gcc/g++, and Python 3 for node-gyp)
  - Ubuntu/Debian:
    ```bash
    sudo apt update
    sudo apt install -y build-essential python3
    ```
  - Rocky Linux / RHEL / Fedora:
    ```bash
    sudo dnf groupinstall -y "Development Tools"
    sudo dnf install -y python3
    ```
  - Verify:
    ```bash
    make --version
    gcc --version
    python3 --version
    ```

## Clone the repository

```bash
git clone https://github.com/chainapsis/oko.git
cd oko
```

## Install/build

```bash
yarn
yarn ci build_pkgs
yarn ci build_cs
yarn ci build_frost
```

This installs dependencies, builds core packages, Cait Sith (tECDSA), and
FROST (tEdDSA).

## Git hooks

The project uses [Husky](https://typicode.github.io/husky/) and
[lint-staged](https://github.com/lint-staged/lint-staged) to run Biome checks
automatically on staged files before each commit.

Yarn 4 does not run the `prepare` script automatically, so you need to set up
Husky manually after installing dependencies:

```bash
yarn prepare
```

## Docs-only changes

If you are only editing documentation, you do not need to run all services.

```bash
# Install workspace dependencies at the repo root
yarn install

# Launch the docs web (port 3205)
cd apps/docs_web
yarn start
```

Open `http://localhost:3205` to preview your changes.

## Database migrations (oko_pg_interface)

Scripts live in `backend/oko_pg_interface/package.json`.

Run from the repo root:
- `migrate`: `yarn ci db_migrate_api` (apply latest migrations)
- `seed`: `yarn ci db_seed_api` (seed data)

Run from `backend/oko_pg_interface`:
- `migrate_down`: `yarn migrate_down` (rollback one batch)
- `migrate_up`: `yarn migrate_up` (apply one batch)
- `schema_make`: `yarn schema_make <name>` (create a new TS migration)

### Seed data (dev target)

Seeding populates the database with:

- Admin user for oko_admin_web (`admin@keplr.app` / password: `0000`)
- Customer record (`demo_web`)
- Customer dashboard user (`demo@keplr.app` / password: `00000000`)
- API keys for customer authentication
- Key share node URLs (dev: `http://localhost:4201`, `http://localhost:4202`)
- Key share node metadata (SSS threshold config, default: 2)
- TSS activation settings (master switch)

## Local CI helpers (yarn ci)

Execute `yarn ci` at the workspace root to run CI helpers. CLI arguments are
forwarded to the operation script.

### Workspace root

- Build packages: `yarn ci build_pkgs`
  - Packages are built in the right order
  - Required for all services that depend on these core packages
- Build Cait Sith (tECDSA): `yarn ci build_cs`
  - Builds Rust addon (required for `oko_api` TSS operations: triples, presign,
    sign)
  - Builds WASM and copies into `oko_attached/public/pkg/` (client-side tECDSA)
- Build FROST (tEdDSA): `yarn ci build_frost`
  - Builds Rust addon (required for `oko_api` Ed25519 TSS operations: keygen,
    sign)
  - Builds WASM and copies into `oko_attached/public/pkg/` (client-side tEdDSA)
- Typecheck: `yarn ci typecheck`
- keyshare node DB migration: `yarn ci db_migrate_ksn --use-env-file`
  - With `--use-env-file`, reads `~/.oko/key_share_node*.env` to create/migrate
    per-node DBs
  - Without it, uses local defaults (`localhost:5432`, `key_share_node_dev*`)
- DB migration: `yarn ci db_migrate_api --use-env-file`
  - With `--use-env-file`, uses `~/.oko/oko_api_server.env`
  - Without it, auto-starts internal Docker Compose (`pg_local`) and migrates
    with test config
- DB seed: `yarn ci db_seed_api --use-env-file --target dev`
  - `--target` supports `dev | prod` (use `dev` for local)

Note: `yarn ci` is a thin wrapper around
`yarn --cwd ./internals/ci run start <command>`. Run `yarn ci --help` to list
available commands.
