---
title: Integration Overview
sidebar_position: 1
---

# Integration Overview

Oko can be used alongside existing wallet connection methods, including the
Keplr browser extension and mobile app.

Integration is simple. Just add social login to your onboarding flow and you're
ready to go. We support Google, email, GitHub, X, Discord, and Telegram login.
## Getting Started

All Oko components are Apache 2.0 licensed and designed to be self-hosted,
giving you complete architectural control and customization.

Use Oko's open source components to deploy and operate your own wallet
infrastructure. This path is ideal for teams that want:

- Full architectural control
- On-premise deployment
- The ability to customize key management, signing, and login flows

If you're planning to run it yourself, check out our
[self hosting guide](../standalone/self-hosting-standalone.md) for a detailed
walkthrough.

## Why Choose Oko?

Most wallets rely on a **single private key** that can be stolen, lost, or
compromised. Oko uses **threshold signatures** to eliminate this single point of
failure while providing a superior user experience.

### Traditional Wallets vs. Oko

| Traditional Wallets                      | Oko                                                                  |
| ---------------------------------------- | -------------------------------------------------------------------- |
| 🔐 Single private key controls all funds | 🔒 **Distributed key shares** - no single private key exists         |
| 🧩 Browser extension required            | 🚀 **Embedded in your application** - no extensions needed           |
| 🔄 Complex user onboarding               | ⚡ **Google OAuth login** - simple and familiar                      |
| ⚠️ Single point of failure               | 🛡️ **Cryptographically impossible** for single party to access funds |

**Key Benefits:**

- **🔒 Enhanced Security** - Threshold signatures eliminate single points of
  failure
- **🚀 Better UX** - Seamless integration without browser extensions
- **⚡ Easy Integration** - Drop-in replacement for existing wallet connections

## Try It Yourself

Want to see threshold signatures in action? Experience the difference firsthand:

**🚀 Try the Demo** - Run `demo_web` locally to sign transactions without any wallet setup
