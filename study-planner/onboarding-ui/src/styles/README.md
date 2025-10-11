# A/B/C Theme Testing System

This document describes the three-variant theme system implemented for A/B/C testing different UI styles.

## Overview

The application supports three distinct visual themes that can be switched dynamically for testing user preferences:

- **Theme A**: Clean, minimal design with standard gray/white color scheme
- **Theme B**: Blue/purple gradients with enhanced styling and subtle effects
- **Theme C**: Rich colors with glass morphism and luxury effects

## Theme Variants

### Theme A
- **Target Audience**: Users who prefer clean, professional interfaces
- **Color Palette**: Grays, whites, minimal colors
- **Visual Style**: Clean lines, standard shadows, traditional form styling
- **Use Case**: Conservative users, enterprise environments

### Theme B 
- **Target Audience**: Users who appreciate contemporary design
- **Color Palette**: Blues, indigos, purples with gradients
- **Visual Style**: Gradient backgrounds, enhanced shadows, modern typography
- **Use Case**: Tech-savvy users, modern applications

### Theme C
- **Target Audience**: Users who want luxury, high-end feel
- **Color Palette**: Rich purples, roses, ambers with glass effects
- **Visual Style**: Glass morphism, premium shadows, bold gradients
- **Use Case**: Premium products, luxury brands

## Implementation

### Feature Flags
The theme system is controlled by the `styleVariant` feature flag in `src/config/featureFlags.ts`:

```typescript
export type StyleVariant = 'A' | 'B' | 'C';
```

### Theme Configuration
Each theme is defined in `src/styles/themes.ts` with comprehensive styling options:

```typescript
export interface ThemeConfig {
  pageBackground: string;
  cardBackground: string;
  cardBorder: string;
  // ... more theme properties
}
```

### Usage in Components
Components use the `useTheme` hook to access theme classes:

```typescript
import { useTheme } from '../hooks/useTheme';

const { getClasses } = useTheme();

// Apply theme classes
<div className={getClasses('cardBackground')}>
```

## Testing

### URL Parameters
You can test different themes by adding URL parameters:

- Theme A: `?style=A` or `?theme=A`
- Theme B: `?style=B` or `?theme=B`  
- Theme C: `?style=C` or `?theme=C`

### Environment Variables
Set the default theme via environment variables:

```bash
VITE_STYLE_VARIANT=B
```

### Development Debugger
In development mode, a theme debugger appears in the top-right corner showing:
- Current active theme
- Quick links to test all variants
- Feature flag status

## A/B/C Testing Setup

### Analytics Integration
Track theme performance by logging the active variant:

```typescript
import { getStyleVariant, getStyleVariantLabel } from '../config/featureFlags';

// Log for analytics
const theme = getStyleVariant();
analytics.track('page_view', {
  theme_variant: theme,
  theme_label: getStyleVariantLabel(theme)
});
```

### Conversion Tracking
Monitor conversion rates by theme:

```typescript
// Track conversions with theme context
analytics.track('form_submitted', {
  theme_variant: getStyleVariant(),
  step: currentStep
});
```

### URL Generation for Testing
Generate test URLs programmatically:

```typescript
import { generateStyleTestUrls } from '../config/featureFlags';

const testUrls = generateStyleTestUrls('https://yourapp.com');
// Returns: { classic: 'url', modern: 'url', premium: 'url' }
```

## Performance Considerations

### CSS Bundle Size
Each theme adds minimal CSS overhead as styles are applied via Tailwind classes.

### Runtime Performance
Theme switching is instant as it only changes CSS classes, no re-rendering required.

### Caching
Theme preference can be cached in localStorage:

```typescript
// Cache user's preferred theme
localStorage.setItem('preferredTheme', getStyleVariant());
```

## Metrics to Track

### User Engagement
- Time spent on page by theme
- Bounce rate by theme
- User interactions by theme

### Conversion Metrics
- Form completion rates by theme
- Step progression by theme
- Error rates by theme

### User Preferences
- Theme selection when given choice
- Return visit theme consistency
- Device/demographic preferences

## Best Practices

### Component Development
1. Always use theme classes instead of hardcoded styles
2. Test components with all three themes
3. Ensure accessibility across all variants

### Testing Strategy
1. Split traffic evenly across variants (33/33/33)
2. Run tests for statistical significance
3. Consider seasonal/demographic factors

### Rollout Strategy
1. Start with small percentage of users
2. Monitor key metrics closely
3. Gradually increase exposure based on results

## Troubleshooting

### Theme Not Applying
1. Check feature flag configuration
2. Verify URL parameters are correct
3. Ensure theme hook is imported correctly

### Missing Styles
1. Verify theme configuration includes all required properties
2. Check that component uses `getClasses()` for all styled elements
3. Ensure Tailwind classes are not purged

### Performance Issues
1. Monitor bundle size impact
2. Check for unnecessary re-renders
3. Optimize theme class concatenation
