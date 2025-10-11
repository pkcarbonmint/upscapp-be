# UPSC App Backend - PNPM Workspace

This repository uses a pnpm workspace to manage multiple frontend packages and the helios-ts library.

## Packages

- **helios-ts**: TypeScript study plan generation engine
- **onboarding-ui**: React app for student onboarding
- **shared-ui-library**: Shared UI components library
- **faculty-ui**: React app for faculty interface
- **plan-editor-library**: Drag-and-drop study plan editor

## Quick Start

### Prerequisites
- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Installation
```bash
# Install all dependencies for all packages
pnpm install:all

# Or simply
pnpm install
```

### Development
```bash
# Start development servers
pnpm dev:onboarding    # Start onboarding UI
pnpm dev:faculty       # Start faculty UI
pnpm dev:shared        # Start shared library dev
pnpm dev:plan-editor   # Start plan editor dev
```

### Building
```bash
# Build all packages
pnpm build:all

# Build specific packages
pnpm build:helios      # Build helios-ts library
pnpm build:onboarding  # Build onboarding UI
pnpm build:shared      # Build shared UI library
pnpm build:faculty     # Build faculty UI
pnpm build:plan-editor # Build plan editor library
```

### Docker Build
```bash
# Build frontend Docker image
docker build -f Dockerfile.frontend -t upscapp-frontend .
```

## Package Dependencies

- **onboarding-ui** depends on **helios-ts**
- **faculty-ui** depends on **shared-ui-library**
- All packages can be built independently or together

## Workspace Benefits

1. **Single dependency installation**: Install all packages with one command
2. **Shared dependencies**: Common packages are deduplicated
3. **Cross-package development**: Easy to work on multiple packages simultaneously
4. **Simplified Docker builds**: Single build process for all frontend packages
5. **Type safety**: TypeScript types are shared across packages

## Development Workflow

1. Make changes to any package
2. The workspace automatically handles dependencies
3. Use `pnpm build:all` to build everything
4. Use Docker for production builds

## Troubleshooting

### Clean install
```bash
pnpm clean:install
```

### Check workspace
```bash
pnpm list --depth=0
```
