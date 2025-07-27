import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth, useUser, useSignIn, useSignUp } from '@clerk/clerk-expo';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
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
      
      // Handle authentication state changes
      if (isSignedIn && user) {
        // User is authenticated, sync with backend and navigate to home
        syncUserWithBackend();
        router.replace('/home' as any);
      } else if (!isSignedIn) {
        // User is not authenticated, navigate to sign-in
        router.replace('/sign-in' as any);
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
        if (isBiometricsEnabled) {
          const biometricAuth = await authenticateWithBiometrics();
          if (!biometricAuth) {
            await clerkSignOut();
            throw new Error('Biometric authentication failed');
          }
        }

        // Set the session as active
        if (setActiveSignIn) {
          await setActiveSignIn({ session: signInAttempt.createdSessionId });
        }
        
        // Sync user with backend
        await syncUserWithBackend();
        router.replace('/home' as any);
      } else {
        throw new Error('Sign in failed - incomplete status');
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
      console.log('Signing up with email:', email, 'password:', password, 'firstName:', firstName, 'lastName:', lastName);
      const signUpAttempt = await clerkSignUp.create({
        emailAddress: email,
        password: password,
        firstName: firstName,
        lastName: lastName,
      });

      if (signUpAttempt.status === 'complete') {
        // Set the session as active
        if (setActiveSignUp) {
          await setActiveSignUp({ session: signUpAttempt.createdSessionId });
        }
        
        // Sync user with backend
        await syncUserWithBackend();
        router.replace('/home' as any);
      } else {
        throw new Error('Sign up failed - incomplete status');
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
      await clerkSignOut();
      router.replace('/sign-in' as any);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const enableBiometrics = async () => {
    try {
      if (!isBiometricsAvailable) {
        throw new Error('Biometrics not available on this device');
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to enable biometrics',
        fallbackLabel: 'Use passcode',
      });

      if (result.success) {
        await SecureStore.setItemAsync('biometrics_enabled', 'true');
        setIsBiometricsEnabled(true);
      } else {
        throw new Error('Biometric authentication failed');
      }
    } catch (error) {
      console.error('Enable biometrics error:', error);
      throw error;
    }
  };

  const authenticateWithBiometrics = async (): Promise<boolean> => {
    try {
      if (!isBiometricsAvailable || !isBiometricsEnabled) {
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access your notes',
        fallbackLabel: 'Use passcode',
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    isAuthenticated: isSignedIn || false,
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 