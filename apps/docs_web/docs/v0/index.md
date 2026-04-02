---
title: Welcome to Oko!
slug: /
sidebar_position: 1
---

# Overview

Welcome to Oko! 👋

<div style={{textAlign: "center", margin: "1rem 0"}}>
    <img src="/img/oko-welcome.png" alt="Oko Welcome" style={{width: "100%", height: "auto", borderRadius: "8px"}} />
</div>

Web3 onboarding does not need to be complicated. Oko makes onboarding to your
application easy, fast, and secure. No wallet installs, no recovery phrases, no
friction. It is a fully open source embedded wallet stack that teams can self
host, inspect, and customize from end to end.

Oko integrates the security of non custodial wallets directly into any web or
mobile application. Users sign up with familiar login methods like email or
social, while the wallet keys are protected by a distributed TSS plus SSS
architecture. Private keys are never constructed, never stored, and never
accessible by any single party.

## 🚀 Live Demo

Experience Oko in action:

- **[Demo Application](https://demo.oko.app)** - Explore the Oko experience in a
  live demo

## Why Oko

One of the biggest challenges in crypto is managing wallets across multiple
chains. Keplr (the team behind Oko) has solved this with **a browser extension**
that empowers users to securely self-custody their assets and connect
effortlessly to dApps across ecosystems.

However, onboarding remains one of the biggest barriers for users who are less
familiar with crypto. In Web3, the core advantage is that users bring their own
wallet to every application—unlike Web2, where accounts are tied to individual
platforms. But this Web3 model introduces two major challenges:

- Managing recovery phrases or private keys
- Installing browser extensions or mobile apps

Embedded wallets aim to remove these hurdles by providing a smoother entry
point. Yet, existing solutions sacrifice one of Web3’s defining strengths:
_interoperability across applications and blockchains_. They tend to create
isolated accounts for each application, essentially reverting to a Web2-style
model.

**Oko** solves this by providing an embedded onboarding flow that still
preserves the interoperability of a global wallet address. Developers keep full
control of the integration because everything from client to server is open
source under Apache 2.0. Teams can run Oko entirely on their own infrastructure
or use the hosted dashboards for quick setup.

### Key Advantages

**🔒 Enhanced Security**

- **No single private key** - cryptographically impossible for any one party to
  access private key
- **2-of-2 TSS + SSS MPC** - distributed key management with no single point of
  failure
- **Master key never reconstructed** - private key never revealed at any point

**🚀 Better User Experience**

- **No browser extensions** - embedded directly in your application
- **No recovery phrases** - users don't need to manage complex private keys
- **Social login (e.g. Google OAuth)** - familiar authentication flow
- **Cross-device compatibility** - works on mobile, desktop, any browser
- **Cross-application interoperability** - same, global wallet address across
  multiple Web3 apps

**⚡ Developer Benefits**

- **Fully Open Source with Apache 2.0 License** - freedom to customize and self
  host every layer
- **Standard ECDSA/EdDSA signatures** - compatible with all existing blockchain
  infrastructure
- **Multi-chain support** - Ethereum, Cosmos, and SVM ecosystems
- **Simple integration** - drop-in replacement for existing wallet connections
- **Programmable wallet experience** - combine Web2 convenience with Web3
  security

## Features

**Supported Blockchains**

#### Ethereum & EVM Chains

- **Full EIP-1193 provider** - compatible with all Ethereum dApps
- **Viem integration** - type-safe transaction handling
- **Standard methods**: `personal_sign`, `eth_signTypedData_v4`,
  `eth_sendTransaction`
- **Chain switching** - seamless multi-network support

#### Cosmos Ecosystem

- **Native CosmJS compatibility** - works with existing Cosmos applications
- **Amino and Direct signing** - supports both transaction formats
- **Chain registry integration** - automatic chain discovery and configuration
- **IBC support** - cross-chain operations

#### SVM Chains

- **Solana Web3.js compatibility** - works with existing Solana applications
- **Transaction and message signing** - supports all standard signing methods
- **Wallet Standard support** - compatible with Solana wallet adapter

**Social login support**

- Google OAuth
- Email
- GitHub
- Discord
- X (Twitter)
- Telegram (coming soon)

**Oko SDK**

A lightweight client-side SDK for wallet initialization and social login
integration — fully compatible with React. It lets you embed Oko's MPC-based
wallet directly into your app without requiring users to install additional
wallet extensions.

## Getting Started

Ready to integrate Oko into your application?

### 🚀 **Quick Integration**

- **[Integration Guide](getting-started/integration-overview.md)** - Add to your
  dApp in minutes
- **[SDK Documentation](sdk-usage/sdk-overview.md)** - Ethereum, Cosmos, and SVM
  examples
- **[Starter Templates](getting-started/starter-templates.md)** - Next.js
  example repositories

### 🏗️ **Understanding the System**

- **[Complete Lifecycle Guide](lifecycle.md)** - End-to-end user journey from
  signup to transaction
- **[Technical Overview](concepts/threshold-ecdsa.md)** - How threshold
  signatures work
- **[Architecture](architecture.md)** - System design and integration points

### 📚 **API Reference**

- **[Authentication](api-reference/api-overview.md#authentication)** - Google
  OAuth and session management
- **[Provider Methods](api-reference/api-overview.md)** - Complete API reference

---

**Let's get started! Ready to eliminate single points of failure in your
application? Start with the
[Integration Guide](getting-started/integration-overview.md).**
