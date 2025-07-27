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

export default function SignUpScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const { signUp } = useAuthContext();
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

  const handleSignUp = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    try {
      setIsLoading(true);
      await signUp(email.trim(), password, firstName.trim(), lastName.trim());
      // Prompt for biometric enrollment after successful sign up
      if (biometricAvailable) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Enable Biometric Login?',
          fallbackLabel: 'Skip',
          disableDeviceFallback: false,
        });
        if (result.success) {
          await SecureStore.setItemAsync('biometric_email', email.trim());
          await SecureStore.setItemAsync('biometric_password', password);
          Alert.alert('Success', 'Biometric login enabled! You can now sign in with biometrics.');
        } else {
          Alert.alert('Info', 'Biometric login not enabled. You can enable it later from sign in.');
        }
      }
      // Navigation will be handled by AuthContext after successful sign-up
    } catch (error) {
      console.error('Sign up error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Sign up failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    router.push('/sign-in' as any);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: currentTheme.colors.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: currentTheme.colors.textSecondary }]}>Join Secure Notes today</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={[styles.label, { color: currentTheme.colors.text }]}>First Name</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: currentTheme.colors.surface,
                  borderColor: currentTheme.colors.border,
                  color: currentTheme.colors.text
                }]}
                placeholder="Enter first name"
                placeholderTextColor={currentTheme.colors.textTertiary}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={[styles.label, { color: currentTheme.colors.text }]}>Last Name</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: currentTheme.colors.surface,
                  borderColor: currentTheme.colors.border,
                  color: currentTheme.colors.text
                }]}
                placeholder="Enter last name"
                placeholderTextColor={currentTheme.colors.textTertiary}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>
          </View>

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

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: currentTheme.colors.text }]}>Confirm Password</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: currentTheme.colors.surface,
                borderColor: currentTheme.colors.border,
                color: currentTheme.colors.text
              }]}
              placeholder="Confirm your password"
              placeholderTextColor={currentTheme.colors.textTertiary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: currentTheme.colors.primary }, isLoading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: currentTheme.colors.textSecondary }]}>Already have an account? </Text>
          <TouchableOpacity onPress={handleSignIn} disabled={isLoading}>
            <Text style={[styles.linkText, { color: currentTheme.colors.primary }]}>Sign In</Text>
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  halfWidth: {
    width: '48%',
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