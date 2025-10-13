import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SharedAuthService } from '../../auth/SharedAuthService';
import { mockFetch, mockLocalStorage, mockLocation, createMockUser } from '../mocks/testUtils';
import type { LoginCredentials } from '../../auth/types';

// Mock dependencies
const mockFetchFn = vi.fn();

describe('SharedAuthService', () => {
  let authService: SharedAuthService;
  
  beforeEach(() => {
    // Reset mocks
    mockFetch.reset();
    mockLocalStorage.clear();
    mockLocation.href = 'http://localhost:3000';
    
    // Setup global mocks
    global.fetch = mockFetchFn;
    global.localStorage = mockLocalStorage as any;
    global.window = { location: mockLocation } as any;
    
    // Initialize service
    authService = new SharedAuthService('/api/studyplanner');
    
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Token Management', () => {
    it('should store and retrieve tokens', () => {
      const testToken = 'test_jwt_token';
      
      // Initially no token
      expect(authService.getStoredToken()).toBeNull();
      
      // Store token
      authService.setStoredToken(testToken);
      expect(authService.getStoredToken()).toBe(testToken);
      expect(authService.isAuthenticated()).toBe(true);
      
      // Clear token
      authService.clearStoredToken();
      expect(authService.getStoredToken()).toBeNull();
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('Credential Authentication', () => {
    it('should login with valid credentials', async () => {
      const credentials: LoginCredentials = {
        email: 'faculty@test.com',
        password: 'password123'
      };
      
      const mockUser = createMockUser({ 
        email: credentials.email,
        user_type: 'faculty'
      });
      
      // Mock successful API response
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: mockUser,
            token: 'mock_token_123'
          }
        })
      });
      
      const result = await authService.loginWithCredentials(credentials);
      
      expect(result.user).toEqual(mockUser);
      expect(result.token).toBe('mock_token_123');
      expect(authService.getStoredToken()).toBe('mock_token_123');
      
      // Verify API call
      expect(mockFetchFn).toHaveBeenCalledWith(
        '/api/studyplanner/faculty/auth/login',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify(credentials)
        })
      );
    });

    it('should handle login failure', async () => {
      const credentials: LoginCredentials = {
        email: 'invalid@test.com',
        password: 'wrong_password'
      };
      
      // Mock failed API response
      mockFetchFn.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          message: 'Invalid credentials'
        })
      });
      
      await expect(authService.loginWithCredentials(credentials)).rejects.toThrow();
      expect(authService.getStoredToken()).toBeNull();
    });
  });

  describe('OTP Authentication', () => {
    it('should send OTP successfully', async () => {
      const phoneNumber = '+911234567890';
      
      // Mock successful OTP send
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            success: true,
            verification_id: 'mock_verification_123',
            message: 'OTP sent successfully',
            test_otp: '123456'
          }
        })
      });
      
      const result = await authService.sendOTP(phoneNumber, 'faculty');
      
      expect(result.success).toBe(true);
      expect(result.verification_id).toBe('mock_verification_123');
      expect(result.test_otp).toBe('123456');
      
      // Verify API call
      expect(mockFetchFn).toHaveBeenCalledWith(
        '/api/studyplanner/faculty/auth/send-otp',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ phone_number: phoneNumber })
        })
      );
    });

    it('should verify OTP and login', async () => {
      const verificationId = 'mock_verification_123';
      const otpCode = '123456';
      const mockUser = createMockUser({ user_type: 'faculty' });
      
      // Mock successful OTP verification
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: mockUser,
            token: 'otp_token_123'
          }
        })
      });
      
      const result = await authService.verifyOTP(verificationId, otpCode, 'faculty');
      
      expect(result.user).toEqual(mockUser);
      expect(result.token).toBe('otp_token_123');
      expect(authService.getStoredToken()).toBe('otp_token_123');
      
      // Verify API call
      expect(mockFetchFn).toHaveBeenCalledWith(
        '/api/studyplanner/faculty/auth/verify-otp',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ 
            verification_id: verificationId, 
            otp_code: otpCode 
          })
        })
      );
    });

    it('should handle OTP verification failure', async () => {
      const verificationId = 'invalid_verification';
      const otpCode = '000000';
      
      // Mock failed OTP verification
      mockFetchFn.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          message: 'Invalid OTP'
        })
      });
      
      await expect(
        authService.verifyOTP(verificationId, otpCode, 'faculty')
      ).rejects.toThrow();
      
      expect(authService.getStoredToken()).toBeNull();
    });
  });

  describe('Profile Management', () => {
    it('should get user profile when authenticated', async () => {
      const mockUser = createMockUser({ user_type: 'faculty' });
      
      // Set token first
      authService.setStoredToken('valid_token');
      
      // Mock successful profile response
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockUser
        })
      });
      
      const profile = await authService.getProfile('faculty');
      
      expect(profile).toEqual(mockUser);
      
      // Verify API call includes auth header
      expect(mockFetchFn).toHaveBeenCalledWith(
        '/api/studyplanner/faculty/auth/profile',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid_token'
          })
        })
      );
    });

    it('should handle profile fetch failure', async () => {
      // Mock failed profile response
      mockFetchFn.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          message: 'Unauthorized'
        })
      });
      
      await expect(authService.getProfile('faculty')).rejects.toThrow();
    });
  });

  describe('Logout', () => {
    it('should logout and clear token', async () => {
      // Set initial token
      authService.setStoredToken('token_to_clear');
      
      // Mock logout response
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });
      
      await authService.logout('faculty');
      
      expect(authService.getStoredToken()).toBeNull();
      
      // Verify logout API call
      expect(mockFetchFn).toHaveBeenCalledWith(
        '/api/studyplanner/faculty/auth/logout',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    it('should clear token even if logout API fails', async () => {
      // Set initial token
      authService.setStoredToken('token_to_clear');
      
      // Mock logout failure
      mockFetchFn.mockRejectedValueOnce(new Error('Network error'));
      
      await authService.logout('faculty');
      
      // Token should still be cleared
      expect(authService.getStoredToken()).toBeNull();
    });
  });

  describe('App Detection and Navigation', () => {
    it('should detect onboarding app correctly', () => {
      mockLocation.pathname = '/onboarding/step/background';
      expect(authService.getCurrentApp()).toBe('onboarding');
    });

    it('should detect faculty app correctly', () => {
      mockLocation.pathname = '/faculty/dashboard';
      expect(authService.getCurrentApp()).toBe('faculty');
    });

    it('should handle unknown app paths', () => {
      mockLocation.pathname = '/some/other/path';
      expect(authService.getCurrentApp()).toBe('unknown');
    });

    it('should provide correct app URLs', () => {
      expect(authService.getOnboardingUrl()).toBe('http://localhost:3000/onboarding');
      expect(authService.getFacultyUrl()).toBe('http://localhost:3000/faculty');
    });
  });

  describe('Auth State Initialization', () => {
    it('should initialize with no token', async () => {
      const authState = await authService.initializeAuth();
      
      expect(authState).toEqual({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    });

    it('should initialize with valid stored token', async () => {
      const mockUser = createMockUser({ user_type: 'faculty' });
      const validToken = 'valid_stored_token';
      
      // Set stored token
      authService.setStoredToken(validToken);
      
      // Mock successful profile response
      mockFetchFn.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockUser
        })
      });
      
      const authState = await authService.initializeAuth();
      
      expect(authState).toEqual({
        user: mockUser,
        token: validToken,
        isAuthenticated: true,
        isLoading: false,
      });
    });

    it('should clear invalid stored token', async () => {
      const invalidToken = 'invalid_stored_token';
      
      // Set invalid token
      authService.setStoredToken(invalidToken);
      
      // Mock failed profile response
      mockFetchFn.mockResolvedValueOnce({
        ok: false,
        status: 401
      });
      
      const authState = await authService.initializeAuth();
      
      expect(authState).toEqual({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
      
      // Token should be cleared
      expect(authService.getStoredToken()).toBeNull();
    });
  });
});