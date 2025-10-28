# Google Analytics 4 Setup Guide for A/B/C Theme Testing

This guide explains how to set up Google Analytics 4 to track your A/B/C theme testing and user interactions.

## 🎯 What You Need from Google

### 1. Google Account
- You need a Google account (Gmail, Google Workspace, etc.)
- This will be used to access Google Analytics

### 2. Google Analytics 4 Property
You'll need to create a GA4 property to get your **Measurement ID**

## 📋 Step-by-Step Setup

### Step 1: Create Google Analytics Account

1. **Go to Google Analytics**: Visit [analytics.google.com](https://analytics.google.com)
2. **Sign in** with your Google account
3. **Click "Start measuring"** if you don't have an account
4. **Create Account**:
   - Account name: `LaEx UPSC App` (or your preferred name)
   - Check data sharing settings as needed
   - Click "Next"

### Step 2: Create Property

1. **Property Setup**:
   - Property name: `UPSC Onboarding App`
   - Reporting time zone: `India Standard Time` (or your timezone)
   - Currency: `Indian Rupee - INR` (or your currency)
   - Click "Next"

2. **Business Information**:
   - Industry category: `Education`
   - Business size: Select appropriate size
   - Click "Next"

3. **Business Objectives**:
   - Select "Examine user behavior"
   - Select "Measure advertising ROI" if applicable
   - Click "Create"

### Step 3: Set Up Data Stream

1. **Choose Platform**: Select "Web"
2. **Website URL**: Enter your domain (e.g., `https://yourdomain.com`)
3. **Stream name**: `UPSC Onboarding Web`
4. **Click "Create stream"**

### Step 4: Get Your Measurement ID

1. After creating the stream, you'll see your **Measurement ID**
2. It looks like: `G-XXXXXXXXXX`
3. **Copy this ID** - you'll need it for configuration

### Step 5: Configure Your App

1. **Create Environment File**:
   ```bash
   # Copy the example file
   cp env.example .env
   ```

2. **Add Your Measurement ID**:
   ```bash
   # In your .env file
   VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX  # Replace with your actual ID
   
   # Optional: Enable analytics in development
   VITE_ENABLE_ANALYTICS_DEV=true
   ```

3. **Restart Your Development Server**:
   ```bash
   npm run dev
   ```

## 🎨 A/B/C Testing Events Tracked

### Automatic Tracking
- **Page Views**: Every page/step view with theme context
- **Theme Exposure**: Which theme variant (A/B/C) users see
- **Step Progression**: User flow through onboarding steps
- **Form Interactions**: Field focus, changes, errors
- **Validation Errors**: Specific form validation issues

### Custom Events
- `app_initialized` - App startup with theme variant
- `onboarding_started` - User clicks "Get Started"
- `step_completed` - User completes a form step
- `step_progression` - User moves from step to step
- `form_interaction` - User interacts with form fields
- `form_error` - Form validation errors
- `theme_viewed` - Theme variant exposure
- `conversion` - Goal completions

### Theme-Specific Data
Every event includes:
- `theme_variant`: 'A', 'B', or 'C'
- `theme_label`: 'A (Classic)', 'B (Modern)', 'C (Premium)'
- `step`: Current onboarding step
- `page_location`: Current URL

## 📊 Key Metrics to Monitor

### Conversion Metrics
1. **Step Completion Rates by Theme**:
   - Background → OTP: `step_completed` where `step = 'Background'`
   - OTP → Commitment: `step_completed` where `step = 'OTPVerification'`
   - Full Funnel Completion: `step_completed` where `step = 'Final'`

2. **Theme Performance**:
   - Conversion Rate by `theme_variant`
   - Time to Complete by `theme_variant`
   - Error Rate by `theme_variant`

### Engagement Metrics
1. **Form Interactions**:
   - Field focus events by theme
   - Form completion time by theme
   - Validation error frequency

2. **User Behavior**:
   - Step back/forward navigation
   - Drop-off points by theme
   - Session duration by theme

## 🔍 Setting Up Custom Reports

### 1. Conversion Funnel Report
1. Go to **Reports** → **Explore** → **Funnel exploration**
2. Add steps:
   - Step 1: `onboarding_started`
   - Step 2: `step_completed` (step = 'Background')
   - Step 3: `step_completed` (step = 'OTPVerification')
   - Step 4: `step_completed` (step = 'Final')
3. Add breakdown by `theme_variant`

### 2. Theme Performance Report
1. Go to **Reports** → **Explore** → **Free form**
2. Add dimensions: `theme_variant`, `step`
3. Add metrics: `Event count`, `Conversions`
4. Add comparison by theme variants

### 3. Error Tracking Report
1. **Explore** → **Free form**
2. Filter: `Event name = 'form_error'`
3. Dimensions: `theme_variant`, `error_message`, `form_field`
4. Metrics: `Event count`

## 🧪 Testing Your Setup

### 1. Verify Analytics Loading
```javascript
// Open browser console and check:
console.log(window.gtag) // Should be a function
console.log(window.dataLayer) // Should be an array
```

### 2. Test Theme Tracking
1. Switch between themes using URLs:
   - `?style=A` (Classic)
   - `?style=B` (Modern)  
   - `?style=C` (Premium)
2. Check Real-time reports in GA4
3. Verify events appear with correct `theme_variant`

### 3. Debug Mode
Add to your .env for detailed logging:
```bash
VITE_ENABLE_ANALYTICS_DEV=true
```

## 🚀 Advanced Configuration

### Custom Conversion Goals
1. **Go to Admin** → **Events** → **Create Event**
2. Create custom events for business goals:
   - `payment_completed`
   - `registration_completed`
   - `high_engagement` (time on site > 5 minutes)

### Audience Segmentation
1. **Go to Admin** → **Audiences** → **New Audience**
2. Create segments:
   - "Theme A Users" (theme_variant = 'A')
   - "Theme B Users" (theme_variant = 'B')  
   - "Theme C Users" (theme_variant = 'C')
   - "High Converters" (completed full funnel)

## 📈 Analyzing Results

### Statistical Significance
- Run tests for at least 2 weeks
- Ensure each variant has 100+ users minimum
- Use GA4's built-in statistical significance testing

### Key Questions to Answer
1. Which theme has the highest conversion rate?
2. Which theme has the lowest error rate?
3. Which theme has the best user engagement?
4. Are there demographic differences in theme preference?

## 🔧 Troubleshooting

### Analytics Not Loading
- Check your Measurement ID is correct
- Verify .env file is properly configured
- Check browser console for errors
- Ensure you're not blocking analytics (ad blockers)

### Events Not Appearing
- Check Real-time reports (events appear within minutes)
- Verify theme debugger shows correct variant
- Check browser network tab for gtag requests
- Enable debug mode for detailed logging

## 🎯 Success Metrics

After setup, you should see:
- ✅ Real-time users in GA4 dashboard
- ✅ Theme variants (A/B/C) in custom dimensions
- ✅ Step progression events
- ✅ Form interaction events
- ✅ Conversion funnel data

---

**Need Help?** Check the [GA4 documentation](https://support.google.com/analytics/answer/9304153) or contact your development team.
