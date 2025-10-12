import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { AuthState, LoginCredentials } from './types';
import { sharedAuthService } from './SharedAuthService';

// Auth Context
interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  loginWithOTP: (phoneNumber: string, userType?: 'onboarding' | 'faculty') => Promise<{ success: boolean; verificationId?: string; error?: string }>;
  verifyOTP: (verificationId: string, otpCode: string, userType?: 'onboarding' | 'faculty') => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  getCurrentApp: () => 'onboarding' | 'faculty' | 'unknown';
  navigateToApp: (app: 'onboarding' | 'faculty') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider Component
export const SharedAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const state = await sharedAuthService.initializeAuth();
      setAuthState(state);
    } catch (error) {
      console.error('Auth initialization error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Login with credentials (faculty)
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      const { user, token } = await sharedAuthService.loginWithCredentials(credentials);
      
      setAuthState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
      
      return { success: true };
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { 
        success: false, 
        error: error.message || 'Login failed' 
      };
    }
  }, []);

  // Login with OTP
  const loginWithOTP = useCallback(async (phoneNumber: string, userType: 'onboarding' | 'faculty' = 'faculty') => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      const otpResponse = await sharedAuthService.sendOTP(phoneNumber, userType);
      
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      return { 
        success: true, 
        verificationId: otpResponse.verification_id 
      };
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { 
        success: false, 
        error: error.message || 'Failed to send OTP' 
      };
    }
  }, []);

  // Verify OTP
  const verifyOTP = useCallback(async (verificationId: string, otpCode: string, userType: 'onboarding' | 'faculty' = 'faculty') => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      const { user, token } = await sharedAuthService.verifyOTP(verificationId, otpCode, userType);
      
      setAuthState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
      
      return { success: true };
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { 
        success: false, 
        error: error.message || 'OTP verification failed' 
      };
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      const currentApp = sharedAuthService.getCurrentApp();
      const userType = currentApp === 'onboarding' ? 'onboarding' : 'faculty';
      
      await sharedAuthService.logout(userType);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  // Refresh auth state
  const refresh = useCallback(async () => {
    await initializeAuth();
  }, []);

  // Get current app
  const getCurrentApp = useCallback(() => {
    return sharedAuthService.getCurrentApp();
  }, []);

  // Navigate to app
  const navigateToApp = useCallback((app: 'onboarding' | 'faculty') => {
    if (app === 'onboarding') {
      sharedAuthService.navigateToOnboarding();
    } else {
      sharedAuthService.navigateToFaculty();
    }
  }, []);

  const contextValue: AuthContextType = {
    ...authState,
    login,
    loginWithOTP,
    verifyOTP,
    logout,
    refresh,
    getCurrentApp,
    navigateToApp,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useSharedAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useSharedAuth must be used within a SharedAuthProvider');
  }
  return context;
};

// Component to protect routes
export const ProtectedRoute: React.FC<{ 
  children: React.ReactNode;
  requiredUserType?: 'student' | 'faculty' | 'admin';
  fallback?: React.ReactNode;
}> = ({ children, requiredUserType, fallback }) => {
  const { isAuthenticated, isLoading, user } = useSharedAuth();

  if (isLoading) {
    return fallback || <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return fallback || <div>Please log in to access this page.</div>;
  }

  if (requiredUserType && user?.user_type !== requiredUserType) {
    return fallback || <div>Access denied. Required role: {requiredUserType}</div>;
  }

  return <>{children}</>;
};