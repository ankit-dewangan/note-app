import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth, useUser, useSignIn, useSignUp } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { apiService } from '../services/apiService';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signOut: () => Promise<void>;
  enableBiometrics: () => Promise<void>;
  authenticateWithBiometrics: () => Promise<boolean>;
  isBiometricsEnabled: boolean;
  isBiometricsAvailable: boolean;
  getAuthToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn, signOut: clerkSignOut, getToken } = useAuth() as any;
  const { user } = useUser();
  const { signIn: clerkSignIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp: clerkSignUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp();
  const [isLoading, setIsLoading] = useState(true);
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(false);
  const [isBiometricsAvailable, setIsBiometricsAvailable] = useState(false);

  useEffect(() => {
    checkBiometricsAvailability();
    checkBiometricsStatus();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      setIsLoading(false);
      
      // Handle authentication state changes - sync with backend but don't navigate
      if (isSignedIn && user) {
        // User is authenticated, sync with backend
        syncUserWithBackend();
      }
    }
  }, [isLoaded, isSignedIn, user]);

  const checkBiometricsAvailability = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setIsBiometricsAvailable(hasHardware && isEnrolled);
    } catch (error) {
      console.error('Error checking biometrics availability:', error);
      setIsBiometricsAvailable(false);
    }
  };

  const checkBiometricsStatus = async () => {
    try {
      const biometricsEnabled = await SecureStore.getItemAsync('biometrics_enabled');
      setIsBiometricsEnabled(biometricsEnabled === 'true');
    } catch (error) {
      console.error('Error checking biometrics status:', error);
      setIsBiometricsEnabled(false);
    }
  };

  const syncUserWithBackend = async () => {
    try {
      if (user) {
        const token = await getToken();
        if (token) {
          await apiService.syncUser({
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            avatar: user.imageUrl || '',
          }, token);
        }
      }
    } catch (error) {
      console.error('Error syncing user with backend:', error);
    }
  };

  const getAuthToken = async (): Promise<string | null> => {
    try {
      if (isSignedIn) {
        return await getToken();
      }
      return null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      if (!signInLoaded || !clerkSignIn) {
        throw new Error('Sign in not loaded');
      }

      // Use Clerk's signIn method correctly
      const signInAttempt = await clerkSignIn.create({
        identifier: email,
        password: password,
      });

      if (signInAttempt.status === 'complete') {
        // Check if biometrics is enabled and authenticate
        const biometricsEnabled = await SecureStore.getItemAsync('biometrics_enabled');
        if (biometricsEnabled === 'true') {
          const biometricResult = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Authenticate with biometrics',
            fallbackLabel: 'Use password',
          });
          
          if (!biometricResult.success) {
            throw new Error('Biometric authentication failed');
          }
        }

        // Set the session as active
        await setActiveSignIn({ session: signInAttempt.createdSessionId });
        
        // Store credentials for biometric login
        await SecureStore.setItemAsync('biometric_email', email);
        await SecureStore.setItemAsync('biometric_password', password);
        
        // Sync user with backend
        await syncUserWithBackend();
        router.replace('/home' as any);
      } else {
        
        throw new Error('Sign in failed');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      setIsLoading(true);
      
      if (!signUpLoaded || !clerkSignUp) {
        throw new Error('Sign up not loaded');
      }

      // Use Clerk's signUp method correctly
      const signUpAttempt = await clerkSignUp.create({
        emailAddress: email,
        password: password,
        firstName: firstName,
        lastName: lastName,
      });

      if (signUpAttempt.status === 'complete') {
        // Set the session as active
        await setActiveSignUp({ session: signUpAttempt.createdSessionId });
        
        // Store credentials for biometric login
        await SecureStore.setItemAsync('biometric_email', email);
        await SecureStore.setItemAsync('biometric_password', password);
        
        // Sync user with backend
        await syncUserWithBackend();
        router.replace('/home' as any);
      } else {
        throw new Error('Sign up failed');
      }
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      
      if (clerkSignOut) {
        await clerkSignOut();
      }

      // Clear stored credentials
      await SecureStore.deleteItemAsync('biometric_email');
      await SecureStore.deleteItemAsync('biometric_password');
      await SecureStore.deleteItemAsync('auth_token');
      router.replace('/');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const enableBiometrics = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable biometric authentication',
        fallbackLabel: 'Use password',
      });
      
      if (result.success) {
        await SecureStore.setItemAsync('biometrics_enabled', 'true');
        setIsBiometricsEnabled(true);
      } else {
        throw new Error('Biometric authentication failed');
      }
    } catch (error) {
      console.error('Error enabling biometrics:', error);
      throw error;
    }
  };

  const authenticateWithBiometrics = async (): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate with biometrics',
        fallbackLabel: 'Use password',
      });
      
      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    isAuthenticated: isSignedIn,
    isLoading,
    user,
    signIn,
    signUp,
    signOut,
    enableBiometrics,
    authenticateWithBiometrics,
    isBiometricsEnabled,
    isBiometricsAvailable,
    getAuthToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 