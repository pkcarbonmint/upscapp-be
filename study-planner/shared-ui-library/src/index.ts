// Main export file for shared-ui-library

// Auth exports
export * from './auth/types';
export { SharedAuthService, sharedAuthService } from './auth/SharedAuthService';
export { useSharedAuth, SharedAuthProvider, ProtectedRoute } from './auth/useSharedAuth';

// Service exports
export { StudentService, studentService } from './services/StudentService';
export { PaymentService, paymentService } from './services/PaymentService';

// Component exports
export { default as CrossAppNavigation } from './components/CrossAppNavigation';
export { default as StudentList } from './components/StudentList';

// Re-export any existing components from the library
// export * from './components/OTPComponent'; // Uncomment if this exists