import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { facultyApi } from '../services/api';
import { FacultyAuthState, LoginForm } from '../types';

export const useFacultyAuth = () => {
  const [authState, setAuthState] = useState<FacultyAuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const navigate = useNavigate();

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('faculty_token');
      if (token) {
        try {
          const user = await facultyApi.getProfile();
          setAuthState({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          // Token is invalid, clear it
          localStorage.removeItem('faculty_token');
          setAuthState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (credentials: LoginForm) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      const { user, token } = await facultyApi.login(credentials);
      
      localStorage.setItem('faculty_token', token);
      setAuthState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
      
      navigate('/faculty/dashboard');
      return { success: true };
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      };
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      await facultyApi.logout();
    } catch (error) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('faculty_token');
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
      navigate('/faculty/login');
    }
  }, [navigate]);

  const requireAuth = useCallback(() => {
    if (!authState.isLoading && !authState.isAuthenticated) {
      navigate('/faculty/login');
    }
  }, [authState.isLoading, authState.isAuthenticated, navigate]);

  return {
    ...authState,
    login,
    logout,
    requireAuth,
  };
};
