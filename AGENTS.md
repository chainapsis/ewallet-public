# Oko Wallet

An open-source embedded wallet stack built on MPC (Multi-Party Computation).
Private keys are never reconstructed — signing happens via threshold signatures
across distributed nodes.

## Architecture Overview

Oko is a monorepo with layered dependencies. Understanding the dependency flow
is essential:

```
lib/ (stdlib_js, dotenv, aws, postgres_lib)
  └─ common/oko_types (shared TypeScript types)
  └─ crypto/ (Rust → WASM/addon threshold signatures)
      └─ sdk/ (chain-agnostic core → chain-specific SDKs)
      └─ backend/ (API servers consuming crypto addons)
          └─ apps/ (Next.js frontends consuming SDKs + APIs)
          └─ embed/oko_attached (embeddable wallet iframe)
```

### `crypto/` — Threshold Signatures

Rust → WASM (browser) and Node.js addon (server) builds. `tecdsa/` for
EVM/Cosmos (Cait-Sith), `teddsa/` for Solana (FROST). Also includes shared
crypto utilities (`bytes`, `crypto_js`).

### `sdk/` — Client SDKs

Core provides chain-agnostic wallet logic (auth, iframe communication, events).
Chain-specific SDKs extend it:

- `oko_sdk_core` — Base SDK (chain-agnostic)
- `oko_sdk_eth` — EVM provider via `viem`
- `oko_sdk_cosmos` — Keplr-compatible Cosmos interface via `@cosmjs`
- `oko_sdk_svm` — Solana Wallet Standard via `@solana/web3.js`
- `oko_sdk_core_react_native` — React Native adaptation
- `oko_cosmos_kit`, `oko_interchain_kit` — Ecosystem adapters

### `backend/` — API Services

Express.js servers with Zod + OpenAPI schema validation.

- `oko_api/server` — Main API, aggregates sub-APIs and handles TSS operations
- `admin_api` — Admin management
- `ct_dashboard_api` — Customer/team dashboard API
- `user_dashboard_api` — User-facing dashboard operations
- Shared modules: `openapi` (Zod schemas), `oko_pg_interface` (Knex
  migrations), `oko_api_server_state`, `oko_api_error_codes`

### `key_share_node/` — Distributed Signing Nodes (KSN)

Independent Express server for threshold signature key share storage and
signing participation. Has its own DB (`ksn_pg_interface`), auth, and OpenAPI
schema. Communicates with `oko_api` during signing ceremonies.

### `embed/oko_attached` — Embeddable Wallet iframe

React 19 + Vite + TanStack Router app that runs inside an iframe. Handles
client-side crypto (keygen, signing via WASM), UI components, and communicates
with the host page via `window.postMessage`. The heaviest consumer of internal
packages — depends on WASM modules, SDK packages, common UI, and crypto
libraries.

### `ui/oko_common_ui` — Shared UI Components

React component library with fine-grained exports: `button`, `input`, `table`,
`toast`, `dropdown`, `theme`, `typography`, etc. Built with Sass and Floating
UI. Used by `oko_attached` and all `apps/`.

### `apps/` — Web Applications

All Next.js 16 unless noted. Common stack: TanStack Query/Table, Zustand,
react-hook-form.

| App                    | Port | Purpose                                        |
| ---------------------- | ---- | ---------------------------------------------- |
| `demo_web`             | 3200 | SDK integration demo (all chains)              |
| `customer_dashboard`   | 3203 | Business/merchant dashboard                    |
| `oko_admin_web`        | 3204 | Internal admin (KSN nodes, users, sig shares)  |
| `docs_web`             | 3205 | Documentation site (Docusaurus, not Next.js)   |
| `user_dashboard`       | 3206 | End-user asset management and connected apps   |
| `attached_mobile_host_web`   | 3207 | iframe host for mobile ↔ oko_attached communication |
| `email_template_2`     | 3000 | Email template builder (static export)         |

### `internals/` — Build Tooling

- `ci/` — CLI wrapper for build commands (`yarn ci <command>`)
- `docker/`, `github/`, `vercel/` — Deployment configs

## Development Setup

### Prerequisites

```bash
node --version        # v22.x.x or higher
corepack enable       # Yarn 4.x
rustup install       # uses rust-toolchain in repo root
cargo install wasm-pack
```

### Build Order

```bash
yarn install --immutable
yarn ci build_cs       # WASM: tECDSA (Cait-Sith)
yarn ci build_frost    # WASM: tEdDSA (FROST)
yarn ci build_pkgs     # Internal TS packages
yarn ci build_sdk      # SDK packages
yarn ci typecheck
```

## Typecheck & Lint Rules

After modifying `.ts`, `.tsx`, `.js`, or `.jsx` files, always run:
1. **`yarn ci typecheck`** — TypeScript type checking across all packages
2. **`yarn exec biome check --write .`** — Auto-fix lint and formatting errors

## Development Workflow

### Code Style

- **TypeScript**: Biome (`@biomejs/biome`)
- **Rust**: `cargo fmt`
- Run `yarn ci lang_check` before commits

### OpenAPI Specification

Uses `@asteasolutions/zod-to-openapi`. When modifying routes, update both:

1. **Schema** — Zod types with `.openapi()` in `backend/openapi/src/` or
   `key_share_node/server/src/openapi/schema/`
2. **Route** — `registry.registerPath()` alongside the Express handler

### Commit Messages

Follow the `<scope>: <description>` format. Scope is the package or area being
changed. Use lowercase, imperative mood. Always write in English.

```
demo_web: fix load listener leak in useThemeSyncToIframe
sdk: polyfill Event for RN wallet-standard compatibility
project: fix biome lint and format errors
```

### Pull Requests

Use the template in `.github/pull_request_template.md`. Always write in English.
PR title follows the same `<scope>: <description>` format as commit messages.

- Check the `CONTRIBUTING.md` acknowledgement
- Write a **Summary** explaining what changed, why, and the impact
- Add **Links** to related issues or PRs (e.g., `Closes #123`)

### Git Operations

Do not commit, push, or create PRs unless the user explicitly asks. Always
wait for confirmation before performing any git operation that affects the
repository history or remote.

### Common Contribution Patterns

1. **Adding chain support** — Extend `oko_sdk_core`, create chain-specific SDK
2. **Crypto changes** — Modify Rust in `crypto/`, rebuild WASM, update TS
   interfaces
3. **API changes** — Update backend route + OpenAPI schema
4. **UI changes** — Components in `ui/oko_common_ui/`, apps in `apps/`

## Testing & CI

```bash
cargo test --workspace    # Rust tests
yarn ci typecheck         # TypeScript validation
```

All PRs must pass: `yarn ci typecheck` + `cargo check --workspace`

## Quick Reference

| Command                   | Description               |
| ------------------------- | ------------------------- |
| `yarn ci build_cs`        | Build tECDSA WASM         |
| `yarn ci build_frost`     | Build tEdDSA WASM         |
| `yarn ci build_pkgs`      | Build internal packages   |
| `yarn ci build_sdk`       | Build SDK packages        |
| `yarn ci typecheck`       | TypeScript typecheck      |
| `yarn ci lang_check`      | Code style check          |
| `yarn ci lang_format`     | Code formatting           |
| `yarn ci deps_check`      | Dependency verification   |
| `cargo check --workspace` | Rust workspace check      |
| `cargo test --workspace`  | Rust tests                |
