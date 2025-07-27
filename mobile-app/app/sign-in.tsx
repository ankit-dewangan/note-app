import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthContext } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const { signIn } = useAuthContext();
  const { currentTheme } = useTheme();

  React.useEffect(() => {
    // Check if biometrics are available
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hasHardware && enrolled && supportedTypes.length > 0);
    })();
  }, []);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      await signIn(email.trim(), password);
      // Store credentials for biometric login
      await SecureStore.setItemAsync('biometric_email', email.trim());
      await SecureStore.setItemAsync('biometric_password', password);
      // Navigation will be handled by AuthContext after successful sign-in
    } catch (error) {
      console.error('Sign in error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricSignIn = async () => {
    try {
      setIsLoading(true);
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Sign in with Biometrics',
        fallbackLabel: 'Enter Password',
        disableDeviceFallback: false,
      });
      if (result.success) {
        // Retrieve credentials
        const storedEmail = await SecureStore.getItemAsync('biometric_email');
        const storedPassword = await SecureStore.getItemAsync('biometric_password');
        if (storedEmail && storedPassword) {
          await signIn(storedEmail, storedPassword);
        } else {
          Alert.alert('Error', 'No credentials found. Please sign in manually first.');
        }
      } else {
        Alert.alert('Biometric Auth Failed', 'Please try again or use password.');
      }
    } catch (error) {
      console.error('Biometric sign in error:', error);
      Alert.alert('Error', 'Biometric authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = () => {
    router.push('/sign-up' as any);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: currentTheme.colors.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: currentTheme.colors.textSecondary }]}>Sign in to access your notes</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: currentTheme.colors.text }]}>Email</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: currentTheme.colors.surface,
                borderColor: currentTheme.colors.border,
                color: currentTheme.colors.text
              }]}
              placeholder="Enter your email"
              placeholderTextColor={currentTheme.colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: currentTheme.colors.text }]}>Password</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: currentTheme.colors.surface,
                borderColor: currentTheme.colors.border,
                color: currentTheme.colors.text
              }]}
              placeholder="Enter your password"
              placeholderTextColor={currentTheme.colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: currentTheme.colors.primary }, isLoading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {biometricAvailable && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: currentTheme.colors.secondary }, isLoading && styles.buttonDisabled]}
              onPress={handleBiometricSignIn}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Sign in with Biometrics</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: currentTheme.colors.textSecondary }]}>Don't have an account? </Text>
          <TouchableOpacity onPress={handleSignUp} disabled={isLoading}>
            <Text style={[styles.linkText, { color: currentTheme.colors.primary }]}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
 