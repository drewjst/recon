# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for dependency installation
COPY apps/web/package.json apps/web/package-lock.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
WORKDIR /app/apps/web
RUN npm ci

# Copy source files
WORKDIR /app
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Build web app
WORKDIR /app/apps/web

# Accept build-time env var for API URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# Run stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
