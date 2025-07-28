FROM node:22.0.0-alpine

# Create working directory and copy source code
USER node
RUN mkdir -p /home/node/credential_vault/node_modules && chown -R node:node /home/node/credential_vault
WORKDIR /home/node/credential_vault
COPY --chown=node:node . .

# Install dependencies for credential_vault server
RUN yarn set version 4.7.0
RUN yarn workspaces focus --production \
    @keplr-ewallet/credential-vault-server

WORKDIR /home/node/credential_vault/credential_vault/server

CMD [ "yarn", "start" ]
