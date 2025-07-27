import { Stack } from 'expo-router';
import { ClerkProvider } from '@clerk/clerk-expo';
import { AuthProvider } from '../src/contexts/AuthContext';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import * as SecureStore from 'expo-secure-store';

const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

export default function RootLayout() {
  return (
    <ClerkProvider
      tokenCache={tokenCache}
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
    >
      <ThemeProvider>
        <AuthProvider>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="sign-in" />
            <Stack.Screen name="sign-up" />
            <Stack.Screen name="home" />
            <Stack.Screen name="note/[id]" />
            <Stack.Screen name="search" />
            <Stack.Screen name="settings/index" />
            <Stack.Screen name="settings/theme" />
            <Stack.Screen name="settings/theme/custom" />
          </Stack>
        </AuthProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
} 