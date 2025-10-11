# Helios TypeScript Study Plan Engine

A TypeScript implementation of the Helios study plan generation engine, ported from Haskell. This engine generates personalized UPSC study plans based on student profiles, target years, and preparation strategies.

## Features

- **Personalized Study Plans**: Generate comprehensive study plans based on student archetypes and preferences
- **Multi-Cycle Planning**: Support for foundation, consolidation, and revision cycles
- **Subject Sequencing**: Intelligent subject ordering based on confidence levels and exam focus
- **Block Planning**: Group related subjects into manageable study blocks
- **Weekly Scheduling**: Detailed daily task scheduling with time allocation
- **Plan Review**: Comprehensive plan analysis with suggestions and warnings
- **REST API**: Full HTTP API with the same endpoints as the Haskell version
- **TypeScript**: Full type safety and modern JavaScript features

## Installation

```bash
npm install
```

## Development

```bash
# Run tests
npm test

# Build the library
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

## Server Usage

Start the development server:

```bash
npm run server:dev
```

Or start the production server:

```bash
npm run server
```

The server will be available at `http://localhost:8080` with the following endpoints:

- `GET /` - Root page with API documentation
- `GET /status` - Server status
- `GET /health` - Health check
- `POST /echo` - Echo test endpoint
- `POST /plan/generate` - Generate study plan
- `POST /plan/review` - Review study plan
- `POST /bot/conversation` - Telegram bot conversation

## Library Usage

```typescript
import { generateInitialPlan, initializeEngine, quickStart } from 'helios-ts';

// Initialize the engine
const engine = initializeEngine();

// Generate a study plan
const result = await generateInitialPlan(
  'user123',
  config,
  archetype,
  studentIntake
);

// Quick start with default config
const quickResult = await quickStart(
  'user123',
  archetype,
  studentIntake
);
```

## API Client Usage

```typescript
import { heliosClient } from 'helios-ts';

// Generate plan via API
const response = await heliosClient.generatePlan(wizardData);

// Check server status
const status = await heliosClient.getStatus();
```

## Architecture

The engine follows the same architecture as the Haskell version:

1. **Engine** - Core orchestration and plan generation
2. **Sequencer** - Subject ordering and sequencing
3. **HourCalculation** - Dynamic hour calculation based on student profile
4. **BlockPlanner** - Grouping subjects into study blocks
5. **WeeklyScheduler** - Detailed weekly and daily scheduling
6. **OneWeekPlan** - Individual week plan generation
7. **PrepModeEngine** - Preparation mode determination
8. **Services** - Supporting services for data transformation, archetype selection, etc.

## Configuration

The engine uses a configuration object to control behavior:

```typescript
const config = {
  block_duration_clamp: {
    min_weeks: 2,
    max_weeks: 8
  },
  daily_hour_limits: {
    regular_day: 8,
    catch_up_day: 10,
    test_day: 6
  },
  task_effort_split: {
    study: 0.6,
    revision: 0.2,
    practice: 0.15,
    test: 0.05
  }
};
```

## Types

The library provides comprehensive TypeScript types:

- `StudyPlan` - Complete study plan structure
- `StudentIntake` - Student profile and preferences
- `Archetype` - Student archetype definition
- `Block` - Study block with subjects and scheduling
- `StudyCycle` - Multi-week study cycles
- `TimelineAnalysis` - Timeline and availability analysis

## Migration from Haskell

This TypeScript implementation maintains API compatibility with the Haskell version:

- Same HTTP endpoints and request/response formats
- Same data transformation logic
- Same plan generation algorithms
- Same logging and error handling patterns

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

