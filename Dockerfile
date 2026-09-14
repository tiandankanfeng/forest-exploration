FROM node:22-bookworm-slim AS dependencies

WORKDIR /app
# node-pty requires native build tools when no matching prebuilt binary exists.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --include=optional \
    && node -e "require('node-pty')" \
    && npm cache clean --force

FROM node:22-bookworm-slim

WORKDIR /app
# tini forwards shutdown signals and reaps terminal child processes.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates bash tini procps \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV SHELL=/bin/bash
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json index.js index.html ./
USER node
EXPOSE 3000
ENTRYPOINT ["/usr/bin/tini", "-g", "--"]
CMD ["node", "index.js"]
