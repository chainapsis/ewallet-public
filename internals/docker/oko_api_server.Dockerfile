# ───────────────
# Builder stage
# ───────────────
FROM node:22.0.0-alpine AS builder

# Install build tools and system dependencies for Rust and Node native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    musl-dev \
    openssl-dev \
    curl

# Switch to node user and set Rust environment variables
USER node
ENV CARGO_HOME=/home/node/.cargo
ENV PATH="${CARGO_HOME}/bin:${PATH}"

# Install rustup (Rust toolchain manager)
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y

# Create working directory and copy source code
RUN mkdir -p /home/node/oko && chown -R node:node /home/node/oko
WORKDIR /home/node/oko
COPY --chown=node:node ../../.. .

# Remove .npmrc before yarn set version to avoid NPM_TOKEN env var error
# .npmrc is only needed for publishing, not for building
RUN rm -f .npmrc || true

RUN yarn set version 4.7.0

# Install dependencies for tecdsa addon
RUN yarn workspaces focus addon

# Build tecdsa Rust napi addon
WORKDIR /home/node/oko/crypto/tecdsa/cait_sith_keplr_addon/addon
RUN yarn run build

# Install dependencies for teddsa addon
WORKDIR /home/node/oko
RUN yarn workspaces focus @oko-wallet/teddsa-addon-native

# Build teddsa Rust napi addon
WORKDIR /home/node/oko/crypto/teddsa/teddsa_addon/addon
RUN yarn run build

# Build stdlib-js
WORKDIR /home/node/oko
RUN yarn workspaces focus @oko-wallet/stdlib-js
WORKDIR /home/node/oko/lib/stdlib_js
RUN yarn run build

# Build dotenv (depends on stdlib-js)
WORKDIR /home/node/oko
RUN yarn workspaces focus @oko-wallet/dotenv
WORKDIR /home/node/oko/lib/dotenv
RUN yarn run build

# Build crypto/bytes
WORKDIR /home/node/oko
RUN yarn workspaces focus @oko-wallet/bytes
WORKDIR /home/node/oko/crypto/bytes
RUN yarn run build

# Build tecdsa-interface
WORKDIR /home/node/oko
RUN yarn workspaces focus @oko-wallet/tecdsa-interface
WORKDIR /home/node/oko/crypto/tecdsa/tecdsa_interface
RUN yarn run build

# Build oko-types (depends on stdlib-js, bytes, tecdsa-interface)
WORKDIR /home/node/oko
RUN yarn workspaces focus @oko-wallet/oko-types
WORKDIR /home/node/oko/common/oko_types
RUN yarn run build

# Build teddsa-interface (depends on bytes, oko-types/teddsa)
WORKDIR /home/node/oko
RUN yarn workspaces focus @oko-wallet/teddsa-interface
WORKDIR /home/node/oko/crypto/teddsa/teddsa_interface
RUN yarn run build

# Build ksn-interface (depends on bytes, oko-types)
WORKDIR /home/node/oko
RUN yarn workspaces focus @oko-wallet/ksn-interface
WORKDIR /home/node/oko/key_share_node/ksn_interface
RUN yarn run build

# Install dependencies for crypto-js
WORKDIR /home/node/oko
RUN yarn workspaces focus @oko-wallet/crypto-js

# Build crypto-js
WORKDIR /home/node/oko/crypto/crypto_js
RUN yarn run build

WORKDIR /home/node/oko

# Install dependencies for oko_api_server
RUN yarn workspaces focus --production \
    @oko-wallet/oko-api-server

# ───────────────
# Runtime stage
# ───────────────
FROM node:22.0.0-alpine AS runtime

USER node
WORKDIR /home/node/oko

# Copy source code from builder
COPY --from=builder --chown=node:node /home/node/oko /home/node/oko

WORKDIR /home/node/oko/backend/oko_api/server
CMD ["yarn", "start"]
