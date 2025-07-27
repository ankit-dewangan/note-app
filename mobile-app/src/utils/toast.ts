import { Platform, Alert } from 'react-native';

export const useSafeToast = () => {
  const showToast = (options: {
    title?: string;
    description: string;
    type?: 'success' | 'error' | 'warning' | 'info';
  }) => {
    // Use native Alert instead of NativeBase toast to avoid BackHandler issues
    const message = options.title 
      ? `${options.title}\n\n${options.description}`
      : options.description;
    
    Alert.alert(
      options.title || (options.type === 'error' ? 'Error' : 'Success'),
      message,
      [{ text: 'OK', style: 'default' }],
      { cancelable: true }
    );
  };

  return {
    showToast,
    showSuccess: (description: string, title?: string) => 
      showToast({ title, description, type: 'success' }),
    showError: (description: string, title?: string) => 
      showToast({ title, description, type: 'error' }),
    showWarning: (description: string, title?: string) => 
      showToast({ title, description, type: 'warning' }),
    showInfo: (description: string, title?: string) => 
      showToast({ title, description, type: 'info' }),
  };
}; 