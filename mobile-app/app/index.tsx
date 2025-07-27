import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthContext } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';

export default function IndexScreen() {
  const { isAuthenticated, isLoading } = useAuthContext();
  const { currentTheme } = useTheme();

  useEffect(() => {
    // Only navigate after the component is mounted and auth state is loaded
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/home' as any);
      } else {
        router.replace('/sign-in' as any);
      }
    }
  }, [isAuthenticated, isLoading]);

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: currentTheme.colors.text }]}>
          Secure Notes
        </Text>
        <Text style={[styles.subtitle, { color: currentTheme.colors.textSecondary }]}>
          Collaborative encrypted note-taking
        </Text>
        <ActivityIndicator 
          size="large" 
          color={currentTheme.colors.primary} 
          style={styles.loader}
        />
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
  content: {
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  loader: {
    marginTop: 16,
  },
}); 