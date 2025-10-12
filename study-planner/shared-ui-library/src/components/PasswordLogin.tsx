// Password Authentication Component for fallback login
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff, Lock, Phone } from 'lucide-react';
import { enhancedAuthService } from 'shared-ui-library';

interface PasswordLoginProps {
  phoneNumber: string;
  onSuccess: (result: { user: any; accessToken: string; needsOnboarding?: boolean }) => void;
  onError: (error: string) => void;
  onSwitchToOTP?: () => void;
}

const PasswordLogin: React.FC<PasswordLoginProps> = ({
  phoneNumber,
  onSuccess,
  onError,
  onSwitchToOTP
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const result = await enhancedAuthService.loginWithPassword(phoneNumber, password);
      
      if (result.success && result.user && result.accessToken) {
        onSuccess({
          user: result.user,
          accessToken: result.accessToken,
          needsOnboarding: result.needsOnboarding
        });
      } else {
        setError(result.error || 'Login failed');
        onError(result.error || 'Login failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 sm:p-6">
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4 sm:p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
            Sign In with Password
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Enter your password for
          </p>
          <p className="text-sm sm:text-base font-medium text-gray-700 flex items-center justify-center gap-2">
            <Phone className="w-4 h-4" />
            {phoneNumber}
          </p>
        </div>

        {/* Password Form */}
        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="pr-12"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading || !password.trim()}
            className="w-full h-12 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing In...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Sign In
              </>
            )}
          </Button>

          {/* Switch to OTP */}
          {onSwitchToOTP && (
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                Don't remember your password?
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onSwitchToOTP}
                className="text-sm text-blue-600 hover:opacity-80"
              >
                Use OTP Instead
              </Button>
            </div>
          )}
        </form>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            New user? You'll need to register with OTP verification first.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PasswordLogin;