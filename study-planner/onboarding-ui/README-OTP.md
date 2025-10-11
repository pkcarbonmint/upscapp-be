# OTP Verification Setup

This document explains how to set up and use the OTP (One-Time Password) verification feature in the La Mentora onboarding UI.

## Features

- ✅ **Firebase Integration**: Real Firebase phone authentication
- ✅ **Dummy Mode**: Testing mode with predefined OTP codes
- ✅ **Feature Flags**: Easy toggle between modes
- ✅ **Mobile Optimized**: Touch-friendly OTP input
- ✅ **Error Handling**: Comprehensive error states and retry logic
- ✅ **Security**: Rate limiting and attempt tracking

## Quick Start

### 1. ✅ Firebase is Now Installed and Enabled

Firebase is now installed and the code is enabled. The system uses feature flags to control behavior:

### 2. Feature Flag Configuration

The OTP feature is controlled by feature flags in `src/config/featureFlags.ts`:

- `enableOTPVerification`: Enable/disable the OTP step (default: `true`)
- `useFirebaseOTP`: Use Firebase vs dummy mode (default: `false`)

### 3. Environment Variables

Create a `.env` file with:

```env
# Enable OTP verification step
VITE_ENABLE_OTP=true

# Use Firebase (true) or dummy mode (false)
VITE_USE_FIREBASE_OTP=false

# Firebase config (only needed if VITE_USE_FIREBASE_OTP=true)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Usage Modes

### Dummy Mode (Default - for Testing)

- **No Firebase required**
- **Test OTP codes**: `123456`, `000000`, `111111`
- **Instant verification**
- **Perfect for development and testing**

URL parameters for testing:
- `?otp=true` - Enable OTP step
- `?firebaseOTP=false` - Use dummy mode

### Firebase Mode (Production)

1. **Install Firebase**: `npm install firebase`

2. **Uncomment Firebase code** in:
   - `src/services/firebase.ts`
   - `src/services/otpService.ts`

3. **Set up Firebase project**:
   - Enable Phone Authentication in Firebase Console
   - Add your domain to authorized domains
   - Configure reCAPTCHA settings

4. **Set environment variables** with your Firebase config

5. **Enable Firebase mode**:
   ```env
   VITE_USE_FIREBASE_OTP=true
   ```

## Component Integration

The OTP verification step is automatically integrated into the form flow when enabled:

1. **Background** → Enter phone number
2. **OTP Verification** → Verify phone (if enabled)
3. **Commitment** → Continue with form...

## API Integration

The OTP step integrates with your existing API flow. The phone verification status is stored in:

```typescript
interface IWFBackground {
  phoneNumber: string;
  phoneVerified?: boolean; // Added for OTP verification
  // ... other fields
}
```

## Security Features

- **Rate limiting**: Max 3 attempts per session
- **Cooldown**: 60-second resend cooldown
- **Session management**: Verification IDs expire appropriately
- **Input validation**: Numeric-only OTP input with paste support

## Mobile Optimization

- **Touch-friendly**: Large input fields and buttons
- **Auto-advance**: Automatic focus to next input
- **Paste support**: Paste 6-digit codes from SMS
- **Keyboard handling**: Proper backspace navigation
- **Error states**: Clear visual feedback

## Customization

### OTP Input Length
Currently set to 6 digits. To change, update:
- `otpInputs` array length in `OTPVerificationStep.tsx`
- Validation logic for OTP length

### Styling
The component uses Tailwind CSS classes. Key classes:
- `w-12 h-12` - OTP input size
- `text-center text-lg font-semibold` - OTP input styling
- `border-red-500` - Error state styling

### Retry Logic
Configure in `OTPVerificationStep.tsx`:
- `maxAttempts = 3` - Maximum verification attempts
- `resendCooldown = 60` - Seconds between resend attempts

## Troubleshooting

### Common Issues

1. **"Firebase not installed" error**
   - Install Firebase: `npm install firebase`
   - Uncomment Firebase code in service files

2. **reCAPTCHA not showing**
   - Check Firebase console settings
   - Verify domain is authorized
   - Check for console errors

3. **OTP not sending**
   - Verify phone number format
   - Check Firebase quotas
   - Verify API keys

4. **Validation errors**
   - Check phone number format (should include country code)
   - Verify OTP code is 6 digits
   - Check network connectivity

### Debug Mode

Enable debug logging by checking browser console. The OTP service logs:
- Current mode (firebase/dummy)
- Phone number formatting
- API responses
- Error details

## Testing

### Manual Testing

1. **Dummy Mode**:
   - Enter any valid phone number
   - Use test codes: `123456`, `000000`, or `111111`
   - Verify success/error states

2. **Firebase Mode**:
   - Use real phone number
   - Receive actual SMS
   - Test with invalid codes
   - Test resend functionality

### URL Parameters

For quick testing:
- `?otp=true&firebaseOTP=false` - Enable dummy OTP
- `?otp=true&firebaseOTP=true` - Enable Firebase OTP
- `?layout=simple` - Use simple form layout

## Production Checklist

- [ ] Firebase project configured
- [ ] Phone authentication enabled
- [ ] reCAPTCHA configured
- [ ] Environment variables set
- [ ] Firebase package installed
- [ ] Firebase code uncommented
- [ ] Domain authorized in Firebase
- [ ] Rate limiting configured
- [ ] Error monitoring set up

## Support

For issues or questions:
1. Check browser console for errors
2. Verify Firebase configuration
3. Test with dummy mode first
4. Check network requests in DevTools
