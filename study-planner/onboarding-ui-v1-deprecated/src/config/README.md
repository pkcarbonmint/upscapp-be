# Feature Flags Configuration

This directory contains feature flag configurations for the onboarding UI.

## Current Feature Flags

### `showStartDateSelection`
- **Description**: Controls whether the start date selection section is shown on the Target Year step
- **Default**: `false` (hidden)
- **Location**: Target Year Step component

### `useSimpleFormLayout`
- **Description**: Controls the layout style of the Background step form
- **Default**: `false` (uses inline conversational style)
- **Options**: 
  - `false`: Inline conversational style with fill-in-the-blanks
  - `true`: Traditional simple form layout with labeled fields
- **Location**: Background Step component

## How to Enable/Disable Features

**Priority Order**: URL Parameters > Environment Variables > Default Values

### Method 1: URL Parameters (Best for A/B Testing)
Add parameters to the URL:
```
# Simple form layout
https://yoursite.com/?layout=simple
https://yoursite.com/?simpleForm=true

# Enable start date selection
https://yoursite.com/?startDate=true

# Combine multiple features
https://yoursite.com/?layout=simple&startDate=true
```

### Method 2: Environment Variable
Set the environment variable in your `.env` file:
```
VITE_SHOW_START_DATE=true
VITE_USE_SIMPLE_FORM=true
```

### Method 3: Code Change
Edit `featureFlags.ts` and change the default value:
```typescript
export const defaultFeatureFlags: FeatureFlags = {
  showStartDateSelection: true, // Change to true to enable
  useSimpleFormLayout: true,    // Change to true to enable
};
```

### Method 4: Runtime Override (Future)
The system is designed to support runtime overrides via:
- API endpoints
- Local storage
- User preferences

## Adding New Feature Flags

1. Add the flag to the `FeatureFlags` interface
2. Set a default value in `defaultFeatureFlags`
3. Add environment variable support in `getFeatureFlags()`
4. Use `isFeatureEnabled('yourFeatureName')` in components

## A/B Testing Support

### URL-Based A/B Testing
The system supports easy A/B testing through URL parameters:

```typescript
import { getLayoutVariant, getFeatureFlagStatus } from '../config/featureFlags';

// Get current variant
const layoutVariant = getLayoutVariant(); // 'inline' or 'simple'

// Debug current state
console.log(getFeatureFlagStatus());
```

### Test URLs for A/B Testing
```bash
# Variant A (Control): Inline layout
https://yoursite.com/

# Variant B (Test): Simple form layout  
https://yoursite.com/?layout=simple

# Generate test URLs programmatically
import { generateTestUrl } from '../config/featureFlags';

const testUrlA = generateTestUrl('https://yoursite.com/', { layout: 'inline' });
const testUrlB = generateTestUrl('https://yoursite.com/', { layout: 'simple' });
```

### Analytics Integration
Track variants in your analytics:
```typescript
import { getLayoutVariant, getActiveVariant } from '../config/featureFlags';

// Send to analytics
analytics.track('page_view', {
  layout_variant: getLayoutVariant(),
  form_variant: getActiveVariant('useSimpleFormLayout'),
});
```

## Example Usage

```typescript
import { isFeatureEnabled } from '../config/featureFlags';

// In your component
{isFeatureEnabled('showStartDateSelection') && (
  <div>Your feature content here</div>
)}
```
