# goop.timmcmasters.work. Railway builds this from the repo root (the app imports the
# workspace packages), so the build context is the whole monorepo.
FROM node:24-slim AS build
RUN npm install -g pnpm@12.4.2
WORKDIR /repo
COPY . .
# Install only soon and its workspace deps; their `prepare` scripts build core/vue/nuxt.
RUN pnpm install --frozen-lockfile --filter soon...
RUN pnpm --filter soon generate

FROM caddy:2-alpine
COPY apps/soon/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/apps/soon/.output/public /srv
