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
import { useTheme, ThemeColors } from '../../../src/contexts/ThemeContext';

interface ColorOption {
  key: keyof ThemeColors;
  label: string;
  description: string;
  category: 'background' | 'text' | 'primary' | 'secondary' | 'status';
}

const colorOptions: ColorOption[] = [
  // Background colors
  { key: 'background', label: 'Background', description: 'Main app background', category: 'background' },
  { key: 'surface', label: 'Surface', description: 'Card and component backgrounds', category: 'background' },
  { key: 'card', label: 'Card', description: 'Note card background', category: 'background' },
  
  // Text colors
  { key: 'text', label: 'Primary Text', description: 'Main text color', category: 'text' },
  { key: 'textSecondary', label: 'Secondary Text', description: 'Subtitle and description text', category: 'text' },
  { key: 'textTertiary', label: 'Tertiary Text', description: 'Muted and placeholder text', category: 'text' },
  
  // Primary colors
  { key: 'primary', label: 'Primary', description: 'Main brand color', category: 'primary' },
  { key: 'primaryLight', label: 'Primary Light', description: 'Light variant of primary', category: 'primary' },
  { key: 'primaryDark', label: 'Primary Dark', description: 'Dark variant of primary', category: 'primary' },
  
  // Secondary colors
  { key: 'secondary', label: 'Secondary', description: 'Accent color', category: 'secondary' },
  { key: 'secondaryLight', label: 'Secondary Light', description: 'Light variant of secondary', category: 'secondary' },
  { key: 'secondaryDark', label: 'Secondary Dark', description: 'Dark variant of secondary', category: 'secondary' },
  
  // Status colors
  { key: 'success', label: 'Success', description: 'Success and positive actions', category: 'status' },
  { key: 'warning', label: 'Warning', description: 'Warning and caution states', category: 'status' },
  { key: 'error', label: 'Error', description: 'Error and destructive actions', category: 'status' },
  { key: 'info', label: 'Info', description: 'Information and neutral states', category: 'status' },
];

const predefinedColors = [
  '#E94560', '#00D4AA', '#533483', '#FF6B8A', '#4DFFCC',
  '#2196F3', '#4CAF50', '#FF9800', '#F44336', '#9C27B0',
  '#607D8B', '#795548', '#FF5722', '#3F51B5', '#009688',
  '#8BC34A', '#FFC107', '#E91E63', '#00BCD4', '#FFEB3B',
];

export default function CustomThemeScreen() {
  const { currentTheme, setCustomTheme } = useTheme();
  const [customColors, setCustomColors] = useState<Partial<ThemeColors>>({});

  const handleColorSelect = (key: keyof ThemeColors, color: string) => {
    setCustomColors(prev => ({
      ...prev,
      [key]: color,
    }));
  };

  const applyCustomTheme = () => {
    setCustomTheme(customColors);
    Alert.alert('Success', 'Custom theme applied successfully!');
  };

  const resetCustomTheme = () => {
    Alert.alert(
      'Reset Custom Theme',
      'Are you sure you want to reset all custom colors?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setCustomColors({});
          },
        },
      ]
    );
  };

  const getCurrentColor = (key: keyof ThemeColors) => {
    return customColors[key] || currentTheme.colors[key];
  };

  const renderColorOption = (option: ColorOption) => {
    const currentColor = getCurrentColor(option.key);
    
    return (
      <View key={option.key} style={[styles.colorOption, { backgroundColor: currentTheme.colors.card }]}>
        <View style={styles.colorOptionHeader}>
          <Text style={[styles.colorOptionLabel, { color: currentTheme.colors.text }]}>
            {option.label}
          </Text>
          <View style={[styles.colorPreview, { backgroundColor: currentColor }]} />
        </View>
        <Text style={[styles.colorOptionDescription, { color: currentTheme.colors.textSecondary }]}>
          {option.description}
        </Text>
        
        <View style={styles.colorGrid}>
          {predefinedColors.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorButton,
                { backgroundColor: color },
                currentColor === color && styles.selectedColorButton
              ]}
              onPress={() => handleColorSelect(option.key, color)}
            >
              {currentColor === color && (
                <MaterialIcons name="check" size={16} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const groupedOptions = colorOptions.reduce((acc, option) => {
    if (!acc[option.category]) {
      acc[option.category] = [];
    }
    acc[option.category].push(option);
    return acc;
  }, {} as Record<string, ColorOption[]>);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: currentTheme.colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={currentTheme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.colors.text }]}>
          Customize Theme
        </Text>
        <TouchableOpacity style={styles.resetButton} onPress={resetCustomTheme}>
          <MaterialIcons name="refresh" size={24} color={currentTheme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Preview Section */}
        <View style={[styles.previewSection, { backgroundColor: currentTheme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>
            Live Preview
          </Text>
          <View style={[styles.previewCard, { backgroundColor: getCurrentColor('card') }]}>
            <Text style={[styles.previewTitle, { color: getCurrentColor('text') }]}>
              Sample Note Title
            </Text>
            <Text style={[styles.previewContent, { color: getCurrentColor('textSecondary') }]}>
              This is how your notes will look with the custom theme...
            </Text>
            <View style={styles.previewActions}>
              <View style={[styles.previewButton, { backgroundColor: getCurrentColor('primary') }]}>
                <Text style={styles.previewButtonText}>Primary</Text>
              </View>
              <View style={[styles.previewButton, { backgroundColor: getCurrentColor('secondary') }]}>
                <Text style={styles.previewButtonText}>Secondary</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Color Options */}
        {Object.entries(groupedOptions).map(([category, options]) => (
          <View key={category} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>
              {category.charAt(0).toUpperCase() + category.slice(1)} Colors
            </Text>
            {options.map(renderColorOption)}
          </View>
        ))}

        {/* Apply Button */}
        <View style={styles.applySection}>
          <TouchableOpacity
            style={[styles.applyButton, { backgroundColor: currentTheme.colors.primary }]}
            onPress={applyCustomTheme}
          >
            <MaterialIcons name="check" size={20} color="#FFFFFF" />
            <Text style={styles.applyButtonText}>Apply Custom Theme</Text>
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
  resetButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  previewSection: {
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  previewCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  previewContent: {
    fontSize: 14,
    marginBottom: 16,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 8,
  },
  previewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  previewButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  colorOption: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  colorOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  colorOptionDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColorButton: {
    borderColor: '#000000',
  },
  applySection: {
    marginTop: 32,
    marginBottom: 32,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
}); 