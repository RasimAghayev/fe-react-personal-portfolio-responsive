# syntax=docker/dockerfile:1
#
# Multi-stage build: base -> deps -> build -> test -> prod-deps -> runtime.
#
# Only server.js (the Express contact-form mail relay) is shipped as the
# runtime artifact. The React SPA (src/, public/) is a static bundle with
# no decided hosting target yet (Netlify/Vercel/S3/GH Pages are all still
# open questions - see docs/BASELINE.md) - it is NOT containerized as its
# own long-running service. The `build` stage still runs `npm run build`
# so a broken frontend build fails this Dockerfile, and the `test` stage
# runs both the frontend (CRA/Jest) and backend (server.test.js) suites -
# the full repo's behavior contract is exercised even though only the
# backend ships as a runtime image.
#
# `runtime` is reachable for `docker build` (no --target, i.e. the
# default final stage) only by way of `prod-deps` -> `test` -> `build` ->
# `deps` -> `base`, so building the runtime image always re-runs (and
# requires a pass of) the test stage - matching the Docker standard's
# "build fails if tests fail" requirement without relying on a
# cache-busting trick.

############################################################
# base - pinned exact version + digest, shared by every stage
############################################################
FROM node:22.23.4-alpine3.24@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS base
WORKDIR /app

############################################################
# deps - full install (incl. devDependencies, needed to build+test)
############################################################
FROM base AS deps
COPY package.json package-lock.json ./
# --ignore-scripts: this repo's "prepare" script runs husky, which is only
# meaningful against a real .git checkout on a dev machine, not inside a
# Docker build context (no .git is copied in - see .dockerignore). Verified
# pitfall: without --ignore-scripts, "npm ci --omit=dev" in a later stage
# fails with "sh: husky: not found" (husky itself is a devDependency and
# gets omitted, but the prepare script still fires) - see docs/BASELINE.md.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts

############################################################
# build - compile the CRA production bundle (verifies the frontend still
# builds; the bundle is not copied into the runtime stage - see header)
############################################################
FROM deps AS build
COPY . .
ENV CI=true
RUN npm run build

############################################################
# test - the baseline behavior contract: frontend (Jest via react-scripts)
# + backend (server.test.js) suites. A failure here fails the whole image
# build (see header note on the FROM chain).
############################################################
FROM build AS test
RUN npm test -- --watchAll=false \
 && npm run test:server

############################################################
# prod-deps - production-only node_modules, built from the TEST stage so
# that reaching runtime always implies test already passed
############################################################
FROM test AS prod-deps
RUN --mount=type=cache,target=/root/.npm \
    rm -rf node_modules && npm ci --omit=dev --ignore-scripts

############################################################
# runtime - server.js + prod deps only; non-root; healthcheck; no
# compiler/dev tooling/test files/source maps
############################################################
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=5000

RUN addgroup -S app && adduser -S app -G app

COPY --from=prod-deps --chown=app:app /app/node_modules ./node_modules
COPY --chown=app:app package.json ./
COPY --chown=app:app server.js ./

USER app

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 5000) + '/health/live', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["node", "server.js"]
