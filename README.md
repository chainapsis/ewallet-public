# Oko

[![Oko Wallet](https://oko-wallet.s3.ap-northeast-2.amazonaws.com/assets/oko-github-readme.png)](https://demo.oko.app)

Oko is an open-source embedded wallet stack that gives developers full control
over authentication, signing, and key management architecture.

## Key Features and Architecture

Everything is fully open source and Apache-2.0 licensed:

- Non-custodial, based on Multi-Party Computation (MPC)

- Key Management: Hybrid signing model utilizing TSS (Threshold Signature
  Scheming) plus SSS (Shamir’s Secret Sharing)

- Key Security: Signatures are generated via distributed key shares; private key
  never reconstructed.

- User Onboarding: Supports email/social logins; eliminates seed phrases and
  browser extensions.

- Unified Account: Unified global wallet address with native multichain support.

- Modular Architecture: Orchestrator, adaptors, MPC services, and signing logic
  are self-hostable and auditable.

## Integration and Support

- Official Integration: Access enterprise-grade key share infrastructure,
  dedicated monitoring and operational support, and comprehensive Dapp Dashboard
  and User Dashboard interfaces.

- Self-Host (Open Source): Utilize the Apache 2.0 components for complete
  architectural control and customization.

To accelerate Official Integration, submit
[the form](https://form.typeform.com/to/MxrBGq9b) and you’ll receive the next
step by email.

[Demo](https://demo.oko.app) | [Docs](https://docs.oko.app)

## Oko SDK

| Packages                                         | Latest                                                                                                                                  |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| [@oko-wallet/oko-sdk-core](sdk/oko_sdk_core)     | [![npm version](https://img.shields.io/npm/v/@oko-wallet/oko-sdk-core.svg)](https://www.npmjs.com/package/@oko-wallet/oko-sdk-core)     |
| [@oko-wallet/oko-sdk-cosmos](sdk/oko_sdk_cosmos) | [![npm version](https://img.shields.io/npm/v/@oko-wallet/oko-sdk-cosmos.svg)](https://www.npmjs.com/package/@oko-wallet/oko-sdk-cosmos) |
| [@oko-wallet/oko-sdk-eth](sdk/oko_sdk_eth)       | [![npm version](https://img.shields.io/npm/v/@oko-wallet/oko-sdk-eth.svg)](https://www.npmjs.com/package/@oko-wallet/oko-sdk-eth)       |
| [@oko-wallet/oko-sdk-svm](sdk/oko_sdk_svm)       | [![npm version](https://img.shields.io/npm/v/@oko-wallet/oko-sdk-svm.svg)](https://www.npmjs.com/package/@oko-wallet/oko-sdk-svm)       |
| [@oko-wallet/oko-sdk-core-react-native](sdk/oko_sdk_core_react_native) | [![npm version](https://img.shields.io/npm/v/@oko-wallet/oko-sdk-core-react-native.svg)](https://www.npmjs.com/package/@oko-wallet/oko-sdk-core-react-native) |

## How it works

For a deeper dive into Oko’s architecture, check out the
[official documentation](https://docs.oko.app/docs/v0/architecture).

## Running a key share node

Please refer to the
[document](https://github.com/chainapsis/oko/blob/main/documentation/key_share_node.md).

## Contributing

Any contributions you make are greatly appreciated. If you have a suggestion can
improve this project, please do not hesitate to open an issue ticket or raise a
pull request.
[Guidelines](https://github.com/chainapsis/oko/blob/main/CONTRIBUTING.md) are
provided.

## Security

Please see [SECURITY.md](SECURITY.md) for our security policy and how to report
vulnerabilities.

## License

Distributed under the Apache License 2.0. See
[Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0) for more
information.

## Development

### Prerequisites

- Postgres 17+

#### pg_dump

During development, key share node assumes the system has "pg_dump" executable.
pg_dump should be installed while installing Postgres. One way to install on
MacOS is as follows.

```sh
brew install postgresql@18
echo 'export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Continuous integration (CI)

Please refer to `internals/ci`. It is where the commands that can be executed to
automate some commonly used processes are.

Notable CI commands include the following.

- `yarn ci deps_check`, to check the NodeJS dependencies across the repository
- `yarn ci lang_format`, to format NodeJS code across the repository

You may also want to look into `docs/install_and_run.sh` for how to install the
application for development.
