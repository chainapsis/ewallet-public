---
title: Threshold ECDSA Concepts
sidebar_position: 1
---

# Understanding Threshold ECDSA

## What Makes Oko Different?

Traditional wallets store a complete private key that can be stolen, lost, or
compromised. Oko uses **threshold ECDSA** - a cryptographic technique
that eliminates the private key entirely.

## The Mathematics Behind Security

Instead of one private key controlling your funds, threshold ECDSA distributes
cryptographic "shares" across multiple parties. Think of it like a safety
deposit box that requires multiple keys to open - but mathematically guaranteed.

## Why This Matters for Developers

### 🔐 **Cryptographic Guarantees**

- **Mathematically impossible** for any single party to access funds
- **Proven security model** - based on established cryptographic research
- **Standard ECDSA output** - fully compatible with all existing blockchain
  infrastructure

### 🚀 **User Experience Benefits**

- **No private key management** - users never see or handle complex
  cryptographic material
- **No seed phrases** - eliminates the biggest barrier to Web3 adoption
- **Familiar login flow** - Google OAuth instead of wallet installations

### ⚡ **Integration Advantages**

- **Drop-in replacement** - works with existing Web3 libraries (Viem, CosmJS)
- **Multi-chain support** - same security model across Ethereum and Cosmos
- **Future-proof architecture** - extensible to other blockchain ecosystems

## How Threshold Signatures Work

### The Signing Process (Simplified)

1. **Setup Phase**: Generate distributed key shares (happens once per wallet)
2. **Preprocessing**: Create reusable cryptographic material (happens in
   background)
3. **Signing**: Combine shares to create standard ECDSA signature (happens when
   user signs)

**Key Point**: The complete private key never exists at any point in this
process.

### What This Means for Users

**Traditional Wallet Experience:**

```
User → [Private Key in Browser] → Sign Transaction → Blockchain
         ↑ Single Point of Failure
```

**Oko Experience:**

```
User → [Distributed Key Shares] → Sign Transaction → Blockchain
        ↑ No Single Point of Failure
```

Users get the same "click to sign" experience, but with mathematically superior
security.

## Real-World Comparison

### Traditional Wallet Security Model

```
Bank Vault Analogy:
[Single Key] → Opens Vault → Access All Funds
Problem: Anyone with the key controls everything
```

### Oko Security Model

```
Multi-Signature Vault Analogy:
[Key Share 1] + [Key Share 2] → Opens Vault → Access Funds
Advantage: No single party can access funds alone
```

**But unlike traditional multi-sig**, threshold signatures produce standard
ECDSA signatures that work with all existing blockchain infrastructure - no
special smart contracts required.

## Technical Foundation

### The Cait-Sith Protocol

Oko implements the **Cait-Sith protocol** - a cutting-edge threshold
ECDSA scheme with several advantages:

- **Committed Beaver Triples**: Enables efficient preprocessing for faster
  signing
- **secp256k1 Compatibility**: Works with Bitcoin, Ethereum, and Cosmos
  ecosystems
- **Standard Output**: Produces normal ECDSA signatures that all systems
  recognize

### Why Not Multi-Signature?

Traditional multi-signature requires special smart contracts and isn't available
on all blockchains. Threshold signatures work at the cryptographic level, making
them:

- **Universally compatible** - works on any blockchain that supports ECDSA
- **More efficient** - single signature vs multiple signatures
- **More private** - observers can't tell it's a threshold signature

## Ready to Integrate?

Understanding the cryptography is helpful, but you don't need to implement any
of it. The SDK handles all the complexity:

**For Developers:**

- **[Integration Guide](../getting-started/integration-overview.md)** - Start
  building in minutes
- **[SDK Examples](../sdk-usage/sdk-overview.md)** - Copy-paste code samples
- **[Starter Templates](../getting-started/starter-templates.md)** -
  Ready-to-run examples

**For Technical Teams:**

- **[Threshold EdDSA (FROST)](./threshold-eddsa)** - EdDSA threshold signatures
  for SVM chains
- **[Architecture Overview](../architecture)** - System design and security
  model
- **[API Reference](../api-reference/api-overview.md)** - Complete technical
  documentation
