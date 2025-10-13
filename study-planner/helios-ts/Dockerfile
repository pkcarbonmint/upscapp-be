# This stage builds the TypeScript library
FROM node:22-alpine AS builder

WORKDIR /app

# Install Chrome dependencies for Puppeteer
RUN apk add --no-cache \
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

# Copy package files
COPY helios-ts/package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY helios-ts/ ./

# Build the library
RUN npm run build

# --- Final Stage ---
# This stage creates the library distribution image
FROM node:22-alpine AS runtime

# Install Chrome dependencies for Puppeteer
RUN apk add --no-cache \
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

# Copy built library and dependencies from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Note: Resource files will be copied in the main study-planner Dockerfile

# Set environment variables
ENV NODE_ENV=production

# This is a library image - no CMD needed
