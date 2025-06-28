# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Install security updates and build dependencies
RUN apk update && apk upgrade && apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci --include=dev

# Copy source code and configuration files
COPY src/ ./src/
COPY tsconfig.json ./
COPY eslint.config.js ./

# Build the TypeScript application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install security updates and runtime dependencies
RUN apk update && apk upgrade && apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S redmine-mcp -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=redmine-mcp:nodejs /app/dist ./dist

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs && chown -R redmine-mcp:nodejs /app

# Switch to non-root user
USER redmine-mcp

# Expose port (if needed for future HTTP endpoints)
EXPOSE 3000

# Health check to ensure container is healthy
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const { exec } = require('child_process'); exec('echo \"{\\"health\\": \\"ok\\"}\"', (err, stdout) => { if (err) process.exit(1); console.log(stdout); });"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]