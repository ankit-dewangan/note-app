import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuthContext } from '../../src/contexts/AuthContext';

export default function SettingsScreen() {
  const { currentTheme } = useTheme();
  const { signOut } = useAuthContext();

  const handleThemePress = () => {
    router.push('/settings/theme' as any);
  };

  const handleSignOut = () => {
    signOut();
  };

  const settingsOptions = [
    {
      id: 'theme',
      title: 'Theme Settings',
      subtitle: 'Customize app appearance',
      icon: 'palette',
      onPress: handleThemePress,
      color: currentTheme.colors.primary,
    },
    {
      id: 'account',
      title: 'Account Settings',
      subtitle: 'Manage your account',
      icon: 'account-circle',
      onPress: () => {},
      color: currentTheme.colors.secondary,
    },
    {
      id: 'security',
      title: 'Security',
      subtitle: 'Biometric and security settings',
      icon: 'security',
      onPress: () => {},
      color: currentTheme.colors.warning,
    },
    {
      id: 'about',
      title: 'About',
      subtitle: 'App version and information',
      icon: 'info',
      onPress: () => {},
      color: currentTheme.colors.info,
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: currentTheme.colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={currentTheme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.colors.text }]}>
          Settings
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Settings Options */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>
            App Settings
          </Text>
          
          {settingsOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[styles.optionCard, { backgroundColor: currentTheme.colors.card }]}
              onPress={option.onPress}
            >
              <View style={[styles.optionIcon, { backgroundColor: option.color }]}>
                <MaterialIcons name={option.icon as any} size={20} color="#FFFFFF" />
              </View>
              
              <View style={styles.optionContent}>
                <Text style={[styles.optionTitle, { color: currentTheme.colors.text }]}>
                  {option.title}
                </Text>
                <Text style={[styles.optionSubtitle, { color: currentTheme.colors.textSecondary }]}>
                  {option.subtitle}
                </Text>
              </View>
              
              <MaterialIcons 
                name="chevron-right" 
                size={24} 
                color={currentTheme.colors.textTertiary} 
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Current Theme Info */}
        <View style={[styles.section, { backgroundColor: currentTheme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>
            Current Theme
          </Text>
          <View style={styles.themeInfo}>
            <Text style={[styles.themeName, { color: currentTheme.colors.text }]}>
              {currentTheme.name}
            </Text>
            <Text style={[styles.themeDescription, { color: currentTheme.colors.textSecondary }]}>
              {currentTheme.description}
            </Text>
          </View>
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.signOutButton, { backgroundColor: currentTheme.colors.error }]}
            onPress={handleSignOut}
          >
            <MaterialIcons name="logout" size={20} color="#FFFFFF" />
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
  },
  themeInfo: {
    padding: 16,
    borderRadius: 8,
  },
  themeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  themeDescription: {
    fontSize: 14,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
}); 