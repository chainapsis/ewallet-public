---
title: Threshold EdDSA Concepts
sidebar_position: 2
---

# Understanding Threshold EdDSA

## Why EdDSA for SVM Chains?

While Ethereum and Cosmos use **secp256k1 (ECDSA)** signatures, Solana and other
SVM-compatible chains use **Ed25519 (EdDSA)** signatures. Oko supports both
signature schemes through different threshold protocols:

| Chain Ecosystem | Curve     | Protocol   | Implementation  |
| --------------- | --------- | ---------- | --------------- |
| EVM, Cosmos     | secp256k1 | Cait-Sith  | `crypto/tecdsa` |
| SVM (Solana)    | Ed25519   | FROST      | `crypto/teddsa` |

## The FROST Protocol

Oko implements **FROST** (Flexible Round-Optimized Schnorr Threshold
signatures) — a threshold signing protocol designed for Schnorr-based
signature schemes like Ed25519.

### Key Properties

- **Two-round signing**: FROST requires only two communication rounds to
  produce a signature, making it efficient for real-time signing
- **Ed25519 compatibility**: Produces standard Ed25519 signatures recognized by
  Solana and all SVM-compatible chains
- **Threshold security**: Like Cait-Sith for ECDSA, the private key never
  exists in complete form at any point

### FROST vs Cait-Sith

Both protocols achieve the same goal — threshold signatures without
reconstructing the private key — but are designed for different curves:

```
Cait-Sith (ECDSA/secp256k1):
  Setup → Preprocessing (Beaver Triples) → 2-round Signing → ECDSA Signature

FROST (EdDSA/Ed25519):
  Setup → Round 1 (Nonce Commitments) → Round 2 (Signature Shares) → EdDSA Signature
```

## How Threshold EdDSA Works

### 1. Key Generation

Oko uses **seed-based centralized key generation** for Ed25519. The client
generates a random seed, derives the Ed25519 signing scalar, and splits it into
a **2-of-2 FROST threshold** scheme:

```
Random Seed
  → SHA-512 + RFC 8032 Clamping
  → Ed25519 Scalar
  → FROST 2-of-2 Split
      ├── Share₁ (Client, P0)
      └── Share₂ (Server, P1)
```

The two signing participants are:

- **Client (P0)** — the user's browser, holding `keygen_1`
- **Server (P1)** — the TSS API backend, holding `keygen_2` (stored encrypted)

Key Share Nodes (KSNs) do **not** participate in signing. Instead, the client's
signing share is further split via SSS (t-of-n) and distributed to KSNs for
**backup custody and key recovery** only.

### 2. Seed Splitting

The original seed is also split for recovery purposes:

```
Seed → 2-of-2 SSS Split
  ├── Server Seed Share (stored on backend)
  └── User Seed Share → t-of-n SSS Split → distributed to KSNs
```

This layered splitting ensures:

- **Threshold signing** via FROST (signing shares are never combined)
- **Key recovery** via SSS seed reconstruction (only when explicitly requested,
  requires cooperation of server + enough KSNs)

### 3. Signing Process

When a user signs a Solana transaction, only two parties participate — the
client and the server — using the 2-of-2 FROST protocol:

**Round 1 — Nonce Commitments:**

Each participant generates a random nonce and shares a commitment:

```
Client (P0) → commitment₁   (sent to server)
Server (P1) → commitment₀   (returned to client)
```

**Round 2 — Signature Shares:**

Using the combined commitments, each participant computes their signature share:

```
Server (P1) → signature_share₀  (returned to client)
Client (P0) → signature_share₁  (computed locally)
```

**Aggregation (client-side):**

The client combines both shares into a standard Ed25519 signature:

```
signature_share₀ + signature_share₁ → Valid Ed25519 Signature (64 bytes)
```

### 4. Verification

The resulting signature is indistinguishable from a regular Ed25519 signature.
Solana validators verify it using the standard Ed25519 verification algorithm —
no special handling required.

## End-to-End Signing Flow

```
SDK (App)
  │  signTransaction(tx)
  │  Extract message bytes
  ▼
Attached Iframe (Browser)
  │  Display signing UI → User approves
  │
  ├─ Round 1 (local): teddsaSignRound1(clientKeyPackage)
  │   → client nonces + commitment₁
  │
  ├─ POST /tss/v2/sign_ed25519/round1 { msg }
  │   → { session_id, commitment₀ }
  │
  ├─ Round 2 (local): teddsaSignRound2(msg, keyPkg, nonces, [commitment₀, commitment₁])
  │   → client signature_share₁
  │
  ├─ POST /tss/v2/sign_ed25519/round2 { session_id, commitment₁ }
  │   → { signature_share₀ }
  │
  └─ Aggregate: teddsaAggregate(msg, commitments, [share₀, share₁], pubKeyPkg)
      → Ed25519 Signature (64 bytes)
```

## WASM Implementation

The FROST protocol is implemented in Rust and compiled to WebAssembly for
browser environments:

```
crypto/teddsa/
├── frost_core/                    # Core FROST protocol
├── frost_ed25519_keplr/           # Ed25519 specialization
├── frost_ed25519_keplr_wasm/      # WASM bindings
├── teddsa_hooks/                  # TypeScript signing hooks
└── teddsa_interface/              # TypeScript interfaces
```

The WASM module exposes functions for each step of the protocol:

- `cli_keygen_seed_ed25519` — Generate 2-of-2 key shares from a seed
- `cli_sign_round1_ed25519` — Produce round 1 nonce commitments
- `cli_sign_round2_ed25519` — Produce round 2 signature shares
- `cli_aggregate_ed25519` — Combine shares into a final signature
- `cli_verify_ed25519` — Verify the resulting signature

SSS utility functions for key management:

- `sss_split` — Split a secret into t-of-n shares
- `sss_combine` — Reconstruct a secret from threshold-many shares
- `sss_reshare` — Redistribute shares to a new set of participants
- `sss_extend_shares` — Add new participants without changing the polynomial

## Security Guarantees

### Same Principles as Threshold ECDSA

- **No single point of failure** — compromising either the client or the server
  alone does not compromise the key
- **Standard output** — produces normal Ed25519 signatures
- **Transparent to the blockchain** — validators cannot tell a threshold
  signature from a regular one

### Ed25519-Specific Benefits

- **Deterministic nonces** — Ed25519's nonce derivation reduces the risk of
  nonce reuse attacks
- **Faster verification** — Ed25519 verification is faster than ECDSA on most
  platforms
- **Smaller signatures** — 64 bytes vs 71-72 bytes for DER-encoded ECDSA

## Ready to Integrate?

The SDK handles all FROST protocol complexity. You interact with a simple API:

```typescript
import { OkoSvmWallet } from "@oko-wallet/oko-sdk-svm";

const wallet = OkoSvmWallet.init({
  api_key: "your-api-key",
  chain_id: "solana:mainnet",
});

// All threshold EdDSA operations happen behind the scenes
await wallet.data.connect();
const signature = await wallet.data.sendTransaction(transaction, connection);
```

**Learn more:**

- **[Solana Integration](../sdk-usage/solana-integration)** — SDK integration
  guide
- **[Threshold ECDSA](./threshold-ecdsa)** — Cait-Sith protocol for EVM/Cosmos
- **[Architecture Overview](../architecture)** — System design and security
  model
