# Use the base image with pnpm setup and Chromium dependencies
FROM study-planner:base

# Copy source code
COPY study-planner/helios-ts ./helios-ts
COPY study-planner/servers/helios-server ./servers/helios-server

# Copy resource files
COPY resources/ ./resources/

# Build the helios-ts library first, then the server
RUN pnpm --filter helios-ts build
RUN pnpm --filter helios-server build

# Install curl for health checks
RUN apk add --no-cache curl

# Create a non-root user for security
RUN addgroup -g 1001 -S helios && \
    adduser -S helios -u 1001

USER helios

# Set working directory
WORKDIR /app

# Expose the application port
EXPOSE 8080

# Define a health check for the service
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Set the command to run the application
WORKDIR /app/servers/helios-server
CMD ["node", "dist/index.js"]
