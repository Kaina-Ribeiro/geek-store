# Production image for apps/web (Next.js + Payload). Self-hosted deploys
# (Cubeship); on Vercel this file is not used.
FROM node:24-bookworm-slim

ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile

# NEXT_PUBLIC_* values are baked into the browser bundle at build time.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_MP_PUBLIC_KEY
ARG NEXT_PUBLIC_GA_ID
ARG NEXT_PUBLIC_META_PIXEL_ID
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_MP_PUBLIC_KEY=$NEXT_PUBLIC_MP_PUBLIC_KEY \
    NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID \
    NEXT_PUBLIC_META_PIXEL_ID=$NEXT_PUBLIC_META_PIXEL_ID
RUN pnpm --filter web build

ENV NODE_ENV=production PORT=3000
EXPOSE 3000
WORKDIR /app/apps/web
# SEED_ON_BOOT=1 fills a fresh deploy with the demo catalog, once: only while
# the media volume is still empty (the seed wipes the catalog and orders).
CMD ["sh", "-c", "if [ \"$SEED_ON_BOOT\" = 1 ] && [ -z \"$(ls -A media 2>/dev/null)\" ]; then pnpm seed; fi; exec pnpm start"]
