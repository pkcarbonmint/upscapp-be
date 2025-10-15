# Authentication and Payment Integration

This document describes the implementation of Firebase phone authentication and Razorpay payment integration according to the `integration.md` specifications.

## Overview

The implementation provides:

1. **Firebase Phone Authentication** - OTP-based authentication with reCAPTCHA
2. **Password Authentication** - Fallback authentication for existing users  
3. **Razorpay Payment Integration** - Complete payment flow with status checking
4. **Backend API Integration** - User registration, authentication, and enrollment

## Architecture

### Authentication Flow

```
Phone Number → Check User Exists → Firebase OTP / Password Login → Backend JWT → Onboarding (if needed)
```

### Payment Flow

```
Product Selection → Purchase Order → Payment Link → Payment Status → Admission → Enrollment
```

## Components

### Enhanced Authentication Components

1. **`EnhancedAuth`** - Main authentication component
2. **`PasswordLogin`** - Password-based login fallback
3. **`OTPVerificationStep`** - Updated OTP verification with enhanced auth

### Services

1. **`FirebasePhoneAuthService`** - Firebase authentication wrapper
2. **`BackendAuthService`** - Backend API integration
3. **`EnhancedAuthService`** - Combined authentication service
4. **`PaymentService`** - Razorpay payment integration

## Configuration

### Firebase Setup

1. Go to `console.firebase.google.com`
2. Login with `tech@laex.in`
3. Select project `UPSC.PRO`
4. Add your domain to authorized domains (if needed)
5. Get configuration from Project Settings → General → Apps

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=laex-upsc-pro.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=laex-upsc-pro
VITE_FIREBASE_STORAGE_BUCKET=laex-upsc-pro.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id_here
```

## Usage

### Authentication

```typescript
import { enhancedAuthService } from 'shared-ui-library';

// Send OTP
const result = await enhancedAuthService.sendPhoneOTP(phoneNumber, {
  useFirebase: true,
  recaptchaContainerId: 'recaptcha-container'
});

// Verify OTP
const authResult = await enhancedAuthService.verifyPhoneOTP(otpCode, phoneNumber, {
  useFirebase: true
});

// Password login
const passwordResult = await enhancedAuthService.loginWithPassword(phoneNumber, password);
```

### Payment Integration

```typescript
import { paymentService } from 'shared-ui-library';

// Initiate payment
const paymentResult = await paymentService.initiatePayment(
  studentId,
  productId,
  amount,
  studentDetails
);

// Check payment status
const status = await paymentService.checkPaymentStatus(
  referenceId,
  paymentLinkId,
  legalEntityName,
  tenantId
);

// Complete payment flow
const completion = await paymentService.completePaymentFlow(
  userId,
  purchaseIds
);
```

### Component Usage

```tsx
import { EnhancedAuth } from 'shared-ui-library';

<EnhancedAuth
  onSuccess={(result) => {
    // Handle successful authentication
    console.log('User:', result.user);
    console.log('Access Token:', result.accessToken);
    console.log('Needs Onboarding:', result.needsOnboarding);
  }}
  onError={(error) => {
    // Handle authentication error
    console.error('Auth Error:', error);
  }}
/>
```

## API Endpoints

### Authentication Endpoints

- `POST /v2/exists/new` - Check if user exists
- `POST /v2/register` - Register new user
- `POST /auth/token` - Get JWT token for existing user
- `GET /v2/user/{id}` - Get user details
- `POST /v2/users/onboard` - Complete user onboarding

### Payment Endpoints

- `GET /v2/products` - Get available products
- `POST /v2/purchases` - Create purchase order
- `POST /v2/purchaseinstallments` - Add installments
- `POST /v2/purchases/pay/links` - Generate payment link
- `GET /v2/purchases/paymentlink/{id}/status` - Check payment status
- `POST /v2/admission` - Create admission
- `POST /v2/enrollment` - Create enrollment

## Authentication States

The enhanced authentication service manages the following states:

- **Unauthenticated** - No valid token
- **Phone Verification** - OTP sent, awaiting verification
- **Authenticated** - Valid JWT token
- **Needs Onboarding** - Authenticated but profile incomplete

## Payment States

- **Created** - Payment link generated
- **Attempted** - User clicked payment link
- **Pending** - Payment in progress
- **Completed** - Payment successful
- **Failed** - Payment failed
- **Cancelled** - Payment cancelled
- **Expired** - Payment link expired

## Testing

### Test Modes

1. **Firebase Test Mode** - Use test OTP codes
2. **Backend Test Mode** - Mock authentication responses
3. **Payment Test Mode** - Simulate payment flows

### Test Data

- **Test OTP Codes**: `123456`, `000000`, `111111`
- **Test Phone**: Any 10-digit number
- **Test Payment**: Use development mode simulation

## Error Handling

The system provides comprehensive error handling:

1. **Network Errors** - Connection issues, timeouts
2. **Authentication Errors** - Invalid credentials, expired tokens
3. **Payment Errors** - Payment failures, invalid amounts
4. **Validation Errors** - Invalid phone numbers, missing data

## Security Features

1. **Firebase reCAPTCHA** - Bot protection for OTP
2. **JWT Tokens** - Secure backend authentication
3. **Token Refresh** - Automatic token renewal
4. **Payment Encryption** - Razorpay security
5. **Input Validation** - Client and server-side validation

## Deployment Notes

1. **Firebase Domains** - Add production domains to Firebase
2. **Environment Variables** - Set production Firebase config
3. **CORS Configuration** - Configure backend CORS settings
4. **Webhook URLs** - Set Razorpay webhook endpoints

## Troubleshooting

### Common Issues

1. **reCAPTCHA Issues** - Check domain configuration
2. **OTP Not Received** - Verify phone number format
3. **Payment Failures** - Check Razorpay configuration
4. **Token Errors** - Verify JWT secret and expiration

### Debug Mode

Enable debug logging by setting:

```env
VITE_DEBUG_AUTH=true
VITE_DEBUG_PAYMENT=true
```

## Monitoring

The system provides logging for:

1. Authentication attempts and results
2. Payment initiation and completion
3. API response times and errors
4. User registration and onboarding

## Future Enhancements

1. **Biometric Authentication** - Fingerprint/face ID
2. **Social Login** - Google, Facebook integration
3. **Multi-factor Authentication** - Additional security layers
4. **Payment Analytics** - Advanced payment tracking
5. **Offline Support** - Local authentication cache