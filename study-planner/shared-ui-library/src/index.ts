// Main export file for shared-ui-library

// Auth exports
export * from './auth/types';
export { SharedAuthService, sharedAuthService } from './auth/SharedAuthService';
export { useSharedAuth, SharedAuthProvider, ProtectedRoute } from './auth/useSharedAuth';

// New authentication services
export { FirebasePhoneAuthService, firebasePhoneAuth, auth, analytics } from './services/firebase';
export { BackendAuthService, backendAuthService } from './services/BackendAuthService';
export { EnhancedAuthService, enhancedAuthService } from './services/EnhancedAuthService';

// Service exports
export { StudentService, studentService } from './services/StudentService';
export { PaymentService, paymentService } from './services/PaymentService';

// Component exports
export { default as CrossAppNavigation } from './components/CrossAppNavigation';
export { default as StudentList } from './components/StudentList';
export { default as OTPVerification } from './components/OTPVerification';
export { default as PasswordLogin } from './components/PasswordLogin';
export { default as EnhancedAuth } from './components/EnhancedAuth';

// Utility exports
export * from './utils/cn';

// Re-export any existing components from the library
// export * from './components/OTPComponent'; // Uncomment if this exists