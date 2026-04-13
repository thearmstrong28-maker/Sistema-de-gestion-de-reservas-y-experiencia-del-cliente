# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build NestJS application
RUN npm run build


# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init postgresql-client

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy database scripts and migrations
COPY database ./database
COPY scripts ./scripts

# Copy the entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["/app/docker-entrypoint.sh"]
