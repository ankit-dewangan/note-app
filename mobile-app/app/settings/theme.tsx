import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme, ThemeType, ThemeColors } from '../../src/contexts/ThemeContext';

export default function ThemeSettingsScreen() {
  const { currentTheme, themeType, setTheme, setCustomTheme, availableThemes } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>(themeType);

  const handleThemeSelect = (themeType: ThemeType) => {
    setSelectedTheme(themeType);
    setTheme(themeType);
  };

  const handleCustomThemeEdit = () => {
    router.push('/settings/theme/custom' as any);
  };

  const resetToDefault = () => {
    Alert.alert(
      'Reset Theme',
      'Are you sure you want to reset to the default light theme?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setTheme('light');
            setSelectedTheme('light');
          },
        },
      ]
    );
  };

  const renderThemeOption = (theme: any) => {
    const isSelected = selectedTheme === theme.type;
    
    return (
      <TouchableOpacity
        key={theme.type}
        style={[
          styles.themeOption,
          { backgroundColor: theme.colors.card },
          isSelected && { borderColor: theme.colors.primary, borderWidth: 2 }
        ]}
        onPress={() => handleThemeSelect(theme.type)}
      >
        <View style={styles.themePreview}>
          <View style={[styles.previewHeader, { backgroundColor: theme.colors.primary }]}>
            <View style={[styles.previewDot, { backgroundColor: theme.colors.text }]} />
            <View style={[styles.previewDot, { backgroundColor: theme.colors.text }]} />
            <View style={[styles.previewDot, { backgroundColor: theme.colors.text }]} />
          </View>
          <View style={styles.previewContent}>
            <View style={[styles.previewLine, { backgroundColor: theme.colors.text, width: '80%' }]} />
            <View style={[styles.previewLine, { backgroundColor: theme.colors.textSecondary, width: '60%' }]} />
            <View style={[styles.previewLine, { backgroundColor: theme.colors.textSecondary, width: '40%' }]} />
          </View>
        </View>
        
        <View style={styles.themeInfo}>
          <Text style={[styles.themeName, { color: theme.colors.text }]}>
            {theme.name}
          </Text>
          <Text style={[styles.themeDescription, { color: theme.colors.textSecondary }]}>
            {theme.description}
          </Text>
        </View>
        
        {isSelected && (
          <View style={[styles.selectedIndicator, { backgroundColor: theme.colors.primary }]}>
            <MaterialIcons name="check" size={16} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: currentTheme.colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={currentTheme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.colors.text }]}>
          Theme Settings
        </Text>
        <TouchableOpacity style={styles.resetButton} onPress={resetToDefault}>
          <MaterialIcons name="refresh" size={24} color={currentTheme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Theme Options */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>
            Choose Theme
          </Text>
          <Text style={[styles.sectionDescription, { color: currentTheme.colors.textSecondary }]}>
            Select a theme that matches your preference
          </Text>
          
          <View style={styles.themeOptions}>
            {availableThemes.map(renderThemeOption)}
          </View>
        </View>

        {/* Custom Theme Actions */}
        {selectedTheme === 'custom' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>
              Customize Theme
            </Text>
            <Text style={[styles.sectionDescription, { color: currentTheme.colors.textSecondary }]}>
              Personalize your theme colors
            </Text>
            
            <TouchableOpacity
              style={[styles.customizeButton, { backgroundColor: currentTheme.colors.primary }]}
              onPress={handleCustomThemeEdit}
            >
              <MaterialIcons name="palette" size={20} color="#FFFFFF" />
              <Text style={styles.customizeButtonText}>Customize Colors</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Theme Information */}
        <View style={[styles.section, { backgroundColor: currentTheme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>
            Current Theme
          </Text>
          <View style={styles.currentThemeInfo}>
            <Text style={[styles.currentThemeName, { color: currentTheme.colors.text }]}>
              {currentTheme.name}
            </Text>
            <Text style={[styles.currentThemeDescription, { color: currentTheme.colors.textSecondary }]}>
              {currentTheme.description}
            </Text>
          </View>
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
  resetButton: {
    padding: 8,
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
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  themeOptions: {
    gap: 16,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  themePreview: {
    width: 60,
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 16,
  },
  previewHeader: {
    height: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  previewDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  previewContent: {
    flex: 1,
    padding: 8,
    gap: 4,
  },
  previewLine: {
    height: 2,
    borderRadius: 1,
  },
  themeInfo: {
    flex: 1,
  },
  themeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  themeDescription: {
    fontSize: 14,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  customizeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  currentThemeInfo: {
    padding: 16,
    borderRadius: 8,
  },
  currentThemeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  currentThemeDescription: {
    fontSize: 14,
  },
}); 