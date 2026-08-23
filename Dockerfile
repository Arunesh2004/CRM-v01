# syntax=docker/dockerfile:1

# Stage 1: Base image
FROM node:20-alpine AS base
WORKDIR /app
# Install OpenSSL for Prisma
RUN apk add --no-cache openssl libc6-compat

# Stage 2: Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma.config.ts ./
COPY database/schema.prisma ./database/schema.prisma
RUN npm install

# Stage 3: Build the application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment variables needed during build for Prisma generation
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV DIRECT_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_dummy"
ENV CLERK_SECRET_KEY="sk_test_dummy"

# Generate Prisma Client and build Next.js
RUN npx prisma generate
RUN npx next build

# Stage 4: Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy Prisma engine and generated client
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy Next.js artifacts
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
