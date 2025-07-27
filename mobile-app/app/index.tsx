import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthContext } from '../src/contexts/AuthContext';
import { useThemeContext } from '../src/contexts/ThemeContext';

export default function IndexScreen() {
  const { isAuthenticated, isLoading, user } = useAuthContext();
  const { theme, setTheme } = useThemeContext();

  useEffect(() => {
    // If user is already authenticated, redirect to home
    if (isAuthenticated && user) {
      router.replace('/home' as any);
    } else if (!isLoading && !isAuthenticated) {
      // If not authenticated and not loading, redirect to sign-in
      router.replace('/sign-in' as any);
    }
  }, [isAuthenticated, isLoading, user]);

  const handleThemeToggle = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // This screen should not be visible if authentication is properly handled
  return (
    <View style={[styles.container, { backgroundColor: theme === 'dark' ? '#121212' : '#FFFFFF' }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme === 'dark' ? '#FFFFFF' : '#000000' }]}>
          Secure Notes
        </Text>
        <Text style={[styles.subtitle, { color: theme === 'dark' ? '#B0B0B0' : '#757575' }]}>
          Your encrypted note-taking app
        </Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.push('/sign-in' as any)}
          >
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.push('/sign-up' as any)}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.themeButton}
          onPress={handleThemeToggle}
        >
          <Text style={[styles.themeButtonText, { color: theme === 'dark' ? '#FFFFFF' : '#000000' }]}>
            Toggle {theme === 'light' ? 'Dark' : 'Light'} Mode
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
  },
  content: {
    alignItems: 'center',
    padding: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 48,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  secondaryButtonText: {
    color: '#2196F3',
  },
  themeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  themeButtonText: {
    fontSize: 14,
  },
}); 