# Helios Onboarding v2

A modern, minimalist onboarding application for Helios Study Plan Assistant, built with React and TypeScript using Microsoft Fluent Design principles.

## Features

- **Microsoft Fluent Design**: Clean, professional UI with Segoe UI typography
- **6-Step Onboarding Flow**: Streamlined user experience
- **Helios-TS Integration**: Real study plan generation using the helios-ts library
- **Responsive Design**: Works on desktop and mobile
- **TypeScript**: Full type safety throughout
- **Placeholder API Callbacks**: Ready for server integration

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/          # React components
│   ├── Header.tsx
│   ├── ProgressBar.tsx
│   ├── StepLayout.tsx
│   ├── PersonalInfoStep.tsx
│   ├── TargetYearStep.tsx
│   ├── CommitmentStep.tsx
│   ├── ConfidenceStep.tsx
│   ├── PreviewStep.tsx
│   ├── PaymentStep.tsx
│   ├── CompleteStep.tsx
│   └── Navigation.tsx
├── hooks/              # Custom React hooks
│   └── useOnboarding.ts
├── services/           # API and business logic
│   ├── onboardingService.ts
│   └── heliosService.ts
├── styles/             # CSS styles
│   └── index.css
├── types/              # TypeScript type definitions
│   └── index.ts
├── App.tsx             # Main application component
└── main.tsx           # Application entry point
```

## Onboarding Steps

1. **Personal Information**: Name, email, location, academic background
2. **Study Commitment**: Daily study hours commitment
3. **Confidence Assessment**: Subject-wise confidence rating
4. **Target Year**: UPSC exam target year selection (2026, 2027, 2028)
5. **Preview**: Generated study plan overview
6. **Payment**: Plan selection and secure payment processing
7. **Complete**: Success confirmation and next steps

## API Integration

The app includes placeholder callbacks for server integration:

- `OnboardingService.submitPersonalInfo()`
- `OnboardingService.submitCommitment()`
- `OnboardingService.submitConfidenceLevel()`
- `OnboardingService.submitTargetYear()`
- `OnboardingService.generatePaymentLink()`
- `OnboardingService.submitComplete()`

Each step automatically calls the appropriate service method when the user proceeds.

## Helios-TS Integration

The preview step uses the helios-ts library to generate real study plans:

- Converts form data to `StudentIntake` format
- Calls `generateInitialPlan()` to create personalized study plan
- Extracts plan metrics (total hours, cycles, blocks, subjects)
- Calculates key milestones (foundation complete, prelims ready)
- Falls back to mock data if helios-ts fails

## Styling

Uses Microsoft Fluent Design principles:

- **Colors**: Official Microsoft color palette
- **Typography**: Segoe UI font family with proper scale
- **Components**: Fluent-style cards, buttons, and form controls
- **Interactions**: Smooth transitions and hover effects
- **Layout**: Responsive grid system

## Development

The app is built with modern React patterns:

- **Functional Components**: All components use React hooks
- **Custom Hooks**: `useOnboarding` manages form state and navigation
- **TypeScript**: Full type safety with proper interfaces
- **Error Handling**: Graceful fallbacks for API failures
- **Loading States**: Visual feedback during async operations

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+