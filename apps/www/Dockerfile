# goop.timmcmasters.work (the docs site). Railway builds this from the repo root (the app imports the
# workspace packages), so the build context is the whole monorepo.
FROM node:24-slim AS build
RUN npm install -g pnpm@12.4.2
WORKDIR /repo
COPY . .
# Install only www and its workspace deps; their `prepare` scripts build core/vue/nuxt.
RUN pnpm install --frozen-lockfile --filter www...
RUN pnpm --filter www generate

FROM caddy:2-alpine
COPY apps/www/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/apps/www/.output/public /srv
