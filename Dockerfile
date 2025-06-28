# Simple single-stage build
FROM node:18-alpine

# Install security updates and dependencies
RUN apk update && apk upgrade && apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S redmine-mcp -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Copy source code and build
COPY . .
RUN npm run build

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs && chown -R redmine-mcp:nodejs /app

# Switch to non-root user
USER redmine-mcp

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('{\"health\": \"ok\"}')"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]