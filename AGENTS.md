# Oko Wallet

An open-source embedded wallet stack built on MPC (Multi-Party Computation).
Threshold signatures (ECDSA/EdDSA) enable distributed key management without
single points of failure.

## Architecture Overview

### Core Components

- **`crypto/`** - Threshold signature implementations
  - `tecdsa/` - Threshold ECDSA using Cait-Sith (for EVM, Cosmos)
  - `teddsa/` - Threshold EdDSA using FROST (for Solana)
  - Both compile to WASM for browser environments
- **`sdk/`** - Client SDKs for wallet integration
  - `oko_sdk_core/` - Core wallet logic
  - `oko_sdk_eth/`, `oko_sdk_cosmos/`, `oko_sdk_svm/` - Chain-specific SDKs
- **`backend/`** - API services
  - `oko_api/` - Main API server
  - `tss_api/` - Threshold signature service
- **`key_share_node/`** - Distributed signing nodes (KSN)
- **`apps/`** - Web applications (admin, user dashboard, demo)
- **`embed/oko_attached/`** - Embeddable wallet iframe

### Key Design Principles

1. **MPC Security** - Private keys are never reconstructed; signing happens via
   multi-party computation
2. **Multi-chain Support** - Single architecture supports EVM, Cosmos, and
   Solana ecosystems
3. **Modular SDKs** - Chain-specific SDKs extend a common core
4. **WASM-first Crypto** - Rust crypto compiled to WASM for browser
   compatibility

## Development Setup

This project has complex setup requirements due to WASM compilation and multiple
Rust/TypeScript packages. Follow the CI workflow order.

### Prerequisites

```bash
# Node.js 22+ required
node --version  # v22.x.x or higher

# Enable Corepack for Yarn 4.x
corepack enable

# Rust nightly toolchain
rustup default nightly

# wasm-pack for WASM builds
cargo install wasm-pack
```

### Build Order

Package dependencies require a specific build order. Follow CI exactly:

```bash
# 1. Install dependencies
yarn install --immutable

# 2. Build Cait-Sith WASM (tECDSA)
yarn ci build_cs

# 3. Build FROST WASM (tEdDSA)
yarn ci build_frost

# 4. Build internal packages
yarn ci build_pkgs

# 5. Build SDK packages
yarn ci build_sdk

# 6. Run typecheck
yarn ci typecheck
```

## Development Workflow

### Code Style

- **TypeScript**: Biome for linting/formatting (`@biomejs/biome`)
- **Rust**: Standard cargo fmt, workspace-level management
- Run `yarn ci lang_check` before commits

### Common Contribution Patterns

1. **Adding chain support** - Extend `sdk/oko_sdk_core/` and create
   chain-specific SDK
2. **Crypto changes** - Modify Rust in `crypto/`, rebuild WASM, update
   TypeScript interfaces
3. **API changes** - Update `backend/oko_api/`, regenerate OpenAPI types
4. **UI changes** - Components in `ui/oko_common_ui/`, apps in `apps/`

### OpenAPI Specification

This project uses `@asteasolutions/zod-to-openapi` to define API schemas with
Zod and generate OpenAPI specs.

When modifying or adding routes, you **must** update OpenAPI in two places:

1. **Schema definitions** - Define request/response types using Zod with
   `.openapi()` annotations and `registry.register()`:
   - Backend APIs → `backend/openapi/src/` (tss/, ct_dashboard/, oko_admin/,
     etc.)
   - Key Share Node → `key_share_node/server/src/openapi/schema/`

2. **Route registration** - Call `registry.registerPath()` directly in the route
   file alongside the Express route handler. This documents the endpoint's
   method, path, request/response schemas, and security requirements.

See `backend/tss_api/src/routes/keygen.ts` for a complete example of this
pattern.

## Testing Guidelines

```bash
# Rust tests
cargo test --workspace

# TypeScript typecheck (serves as primary validation)
yarn ci typecheck
```

## Common Pitfalls

1. **Build order matters** - WASM packages must build before TypeScript packages
   that depend on them
2. **Rust nightly required** - Some crypto dependencies require nightly features
3. **WASM rebuild after Rust changes** - Always run `yarn ci build_cs` or
   `build_frost` after modifying Rust crypto code
4. **Yarn immutable** - Use `yarn install --immutable` to ensure lockfile
   consistency

## CI Requirements

All PRs must pass:

- TypeScript typecheck (`yarn ci typecheck`)
- Rust check (`cargo check --workspace`)

## Debugging Tips

- **WASM issues** - Check that wasm-pack is installed and Rust nightly is active
- **Type errors after crypto changes** - Rebuild WASM packages first
- **Dependency issues** - Run `yarn ci deps_check` to verify package versions

## Quick Reference

| Command                   | Description                   |
| ------------------------- | ----------------------------- |
| `yarn ci build_cs`        | Build Cait-Sith WASM (tECDSA) |
| `yarn ci build_frost`     | Build FROST WASM (tEdDSA)     |
| `yarn ci build_pkgs`      | Build internal packages       |
| `yarn ci build_sdk`       | Build SDK packages            |
| `yarn ci typecheck`       | TypeScript typecheck          |
| `yarn ci lang_check`      | Code style check              |
| `yarn ci lang_format`     | Code formatting               |
| `yarn ci deps_check`      | Dependency verification       |
| `cargo check --workspace` | Rust workspace check          |
| `cargo test --workspace`  | Rust tests                    |
