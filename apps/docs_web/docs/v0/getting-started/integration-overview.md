---
title: Integration Overview
sidebar_position: 1
---

# Integration Overview

Oko can be used alongside existing wallet connection methods, including the
Keplr browser extension and mobile app.

Integration is simple. Just add social login to your onboarding flow and you're
ready to go. We support Google, email, GitHub, X, and Discord login. Telegram support is coming soon.
We also plan to allow users to connect wallets they already have installed, such
as Keplr and MetaMask.

## Integration Options

Oko can be adopted in two ways. Both paths are fully supported depending on the
needs of your application.

### 1. Self Host (Open source)

Use Oko’s Apache 2.0 licensed components to deploy and operate your own wallet
infrastructure. This path is ideal for teams that want:

- Full architectural control
- On-premise deployment
- The ability to customize key management, signing, and login flows

If you’re planning to run it yourself, check out our
[self hosting guide](../standalone/self-hosting-standalone.md) for a detailed
walkthrough.

### 2. Official Integration

Teams seeking enterprise grade key share infrastructure and dedicated
operational support can choose official integration. This option provides:

- Enterprise grade key share infrastructure
- Monitoring and operational support
- Access to the Oko Dapp Dashboard and User Dashboard

If you want to explore this option, submit
[this form](https://form.typeform.com/to/MxrBGq9b). Next steps will be shared by
email.

## Get Started with Official Integration

Once you submit [this form](https://form.typeform.com/to/MxrBGq9b), we will send
you a temporary password via email to access
the [Oko dApp Dashboard](https://dapp.oko.app). Use the email address you
provided in the form as your login ID. When you sign in for the first time,
you'll receive a verification code via email. Enter the code to proceed, and
you'll be prompted to set a new password.

At the time of login, you should be able to see the API key that has already
been issued to you. Detailed setup instructions are covered in
the [Quick Start Guide](./quick-start.md).

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

**[🚀 Try the Live Demo](https://demo.oko.app)** - Sign transactions without any
wallet setup required
