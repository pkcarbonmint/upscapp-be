# Use the base image with pnpm setup
FROM study-planner:base AS builder

# Copy source code
COPY study-planner/helios-ts ./helios-ts
COPY study-planner/helios-server ./helios-server

# Copy resource files for build-time access (testing)
COPY resources/ ./resources/

# Build the helios-ts library first, then the server
RUN pnpm --filter helios-ts build
RUN pnpm --filter helios-server build

# --- Final Stage ---
# This stage creates the runtime image
FROM node:22-alpine AS runtime

# Install curl for health checks and Chrome dependencies for Puppeteer
RUN apk add --no-cache \
    curl \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    at-spi2-atk \
    atk \
    cups-libs \
    dbus-glib \
    gtk+3.0 \
    libX11 \
    libXcomposite \
    libXcursor \
    libXdamage \
    libXext \
    libXfixes \
    libXi \
    libXrandr \
    libXScrnSaver \
    libXtst \
    pango \
    alsa-lib

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create a non-root user for security
RUN addgroup -g 1001 -S helios && \
    adduser -S helios -u 1001

USER helios

# Set working directory
WORKDIR /app

# Copy built server and dependencies from builder stage
COPY --from=builder /app/helios-server/dist ./dist
COPY --from=builder /app/helios-server/node_modules ./node_modules
COPY --from=builder /app/helios-server/package*.json ./
COPY --from=builder /app/helios-server/tsconfig.json ./tsconfig.json

# Copy the root node_modules installed by pnpm
COPY --from=builder /app/node_modules /node_modules
# Fix the helios-ts symlink by copying the built package
COPY --from=builder /app/helios-ts/dist ./node_modules/helios-ts/dist
COPY --from=builder /app/helios-ts/package.json ./node_modules/helios-ts/package.json

# Copy resource files - these are needed at runtime for the service to function
COPY resources/ /app/resources/

# Expose the application port
EXPOSE 8080

# Define a health check for the service
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Set the command to run the application
CMD ["node", "dist/index.js"]
