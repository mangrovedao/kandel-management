# Build stage
FROM oven/bun:1 as builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source files
COPY . .

# Production stage
FROM oven/bun:1-slim

WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lock ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/node_modules ./node_modules

# Set environment variables
ENV NODE_ENV=production
