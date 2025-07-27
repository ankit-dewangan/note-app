// Re-export shared types
export * from '../../../shared/types';

// Mobile-specific types
export interface AppState {
  isLoading: boolean;
  error: string | null;
}

export interface ThemeState {
  theme: 'light' | 'dark' | 'system';
}

export interface SearchState {
  query: string;
  results: any[];
  isSearching: boolean;
}

export interface CollaborationState {
  activeNoteId: string | null;
  participants: any[];
  isTyping: boolean;
  typingUsers: string[];
} 