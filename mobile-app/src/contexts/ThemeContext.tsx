import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

export type ThemeType = 'light' | 'dark' | 'custom';

export interface ThemeColors {
  // Background colors
  background: string;
  surface: string;
  card: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  
  // Primary colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  // Secondary colors
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Border and divider colors
  border: string;
  divider: string;
  
  // Overlay colors
  overlay: string;
  backdrop: string;
  
  // Custom theme colors
  customPrimary?: string;
  customSecondary?: string;
  customAccent?: string;
}

export interface Theme {
  type: ThemeType;
  colors: ThemeColors;
  name: string;
  description: string;
}

interface ThemeContextType {
  currentTheme: Theme;
  themeType: ThemeType;
  setTheme: (type: ThemeType) => void;
  setCustomTheme: (colors: Partial<ThemeColors>) => void;
  isDark: boolean;
  toggleTheme: () => void;
  availableThemes: Theme[];
}

const lightTheme: Theme = {
  type: 'light',
  name: 'Light',
  description: 'Clean and bright theme for daytime use',
  colors: {
    background: '#FFFFFF',
    surface: '#F8F9FA',
    card: '#FFFFFF',
    text: '#000000',
    textSecondary: '#6C757D',
    textTertiary: '#ADB5BD',
    primary: '#2196F3',
    primaryLight: '#64B5F6',
    primaryDark: '#1976D2',
    secondary: '#FF9800',
    secondaryLight: '#FFB74D',
    secondaryDark: '#F57C00',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
    border: '#E0E0E0',
    divider: '#F0F0F0',
    overlay: 'rgba(0, 0, 0, 0.5)',
    backdrop: 'rgba(0, 0, 0, 0.3)',
  },
};

const darkTheme: Theme = {
  type: 'dark',
  name: 'Dark',
  description: 'Easy on the eyes for nighttime use',
  colors: {
    background: '#121212',
    surface: '#1E1E1E',
    card: '#2D2D2D',
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    textTertiary: '#808080',
    primary: '#90CAF9',
    primaryLight: '#BBDEFB',
    primaryDark: '#64B5F6',
    secondary: '#FFB74D',
    secondaryLight: '#FFCC80',
    secondaryDark: '#FFA726',
    success: '#81C784',
    warning: '#FFB74D',
    error: '#E57373',
    info: '#90CAF9',
    border: '#404040',
    divider: '#2A2A2A',
    overlay: 'rgba(0, 0, 0, 0.7)',
    backdrop: 'rgba(0, 0, 0, 0.5)',
  },
};

const customTheme: Theme = {
  type: 'custom',
  name: 'Custom',
  description: 'Your personalized theme',
  colors: {
    background: '#1A1A2E',
    surface: '#16213E',
    card: '#0F3460',
    text: '#E94560',
    textSecondary: '#A8A8A8',
    textTertiary: '#707070',
    primary: '#E94560',
    primaryLight: '#FF6B8A',
    primaryDark: '#C41E3A',
    secondary: '#00D4AA',
    secondaryLight: '#4DFFCC',
    secondaryDark: '#00A884',
    success: '#00D4AA',
    warning: '#FFB74D',
    error: '#E94560',
    info: '#00D4AA',
    border: '#2A2A3E',
    divider: '#1A1A2E',
    overlay: 'rgba(26, 26, 46, 0.8)',
    backdrop: 'rgba(26, 26, 46, 0.6)',
    customPrimary: '#E94560',
    customSecondary: '#00D4AA',
    customAccent: '#533483',
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const useThemeColors = () => {
  const { currentTheme } = useTheme();
  return currentTheme.colors;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeType, setThemeType] = useState<ThemeType>('light');
  const [customColors, setCustomColors] = useState<Partial<ThemeColors>>({});

  const availableThemes: Theme[] = [
    lightTheme,
    darkTheme,
    {
      ...customTheme,
      colors: { ...customTheme.colors, ...customColors },
    },
  ];

  const currentTheme = availableThemes.find(theme => theme.type === themeType) || lightTheme;

  // Load saved theme on app start
  useEffect(() => {
    loadSavedTheme();
  }, []);

  const loadSavedTheme = async () => {
    try {
      const savedThemeType = await SecureStore.getItemAsync('theme_type');
      const savedCustomColors = await SecureStore.getItemAsync('custom_colors');
      
      if (savedThemeType) {
        setThemeType(savedThemeType as ThemeType);
      }
      
      if (savedCustomColors) {
        setCustomColors(JSON.parse(savedCustomColors));
      }
    } catch (error) {
      console.error('Error loading saved theme:', error);
    }
  };

  const saveTheme = async (type: ThemeType) => {
    try {
      await SecureStore.setItemAsync('theme_type', type);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const saveCustomColors = async (colors: Partial<ThemeColors>) => {
    try {
      await SecureStore.setItemAsync('custom_colors', JSON.stringify(colors));
    } catch (error) {
      console.error('Error saving custom colors:', error);
    }
  };

  const setTheme = (type: ThemeType) => {
    setThemeType(type);
    saveTheme(type);
  };

  const setCustomTheme = (colors: Partial<ThemeColors>) => {
    setCustomColors(colors);
    saveCustomColors(colors);
    setThemeType('custom');
    saveTheme('custom');
  };

  const toggleTheme = () => {
    const newTheme = themeType === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const isDark = themeType === 'dark' || themeType === 'custom';

  const value: ThemeContextType = {
    currentTheme,
    themeType,
    setTheme,
    setCustomTheme,
    isDark,
    toggleTheme,
    availableThemes,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}; 