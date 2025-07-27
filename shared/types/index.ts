// Shared types for both frontend and backend

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  encryptionKey?: string; // Encrypted user-specific key
  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  id: string;
  title: string;
  content: string; // Encrypted content
  createdBy: string;
  collaborators: string[];
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isArchived?: boolean;
  tags?: string[];
  color?: string;
}

export interface FileMetadata {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  noteId?: string;
  s3Key: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CollaborationSession {
  noteId: string;
  userId: string;
  userName: string;
  cursorPosition?: number;
  lastActive: Date;
}

export interface OperationalTransform {
  type: 'insert' | 'delete' | 'retain';
  position: number;
  length: number;
  content?: string;
  timestamp: number;
  userId: string;
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  score: number;
  highlights: {
    title?: string[];
    content?: string[];
  };
}

export interface Theme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
  };
  isDark: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// WebSocket event types
export interface WebSocketEvents {
  // Note collaboration events
  'join-note': {
    noteId: string;
    userId: string;
    userName: string;
  };
  'leave-note': {
    noteId: string;
    userId: string;
  };
  'content-change': {
    noteId: string;
    userId: string;
    operation: OperationalTransform;
  };
  'cursor-position': {
    noteId: string;
    userId: string;
    position: number;
  };
  
  // User presence events
  'user-online': {
    userId: string;
    userName: string;
  };
  'user-offline': {
    userId: string;
  };
  
  // Note events
  'note-created': {
    note: Note;
  };
  'note-updated': {
    note: Note;
  };
  'note-deleted': {
    noteId: string;
  };
  
  // Error events
  'error': {
    message: string;
    code?: string;
  };
}

// Request/Response types
export interface CreateNoteRequest {
  title: string;
  content: string;
  collaborators?: string[];
  tags?: string[];
  color?: string;
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
  collaborators?: string[];
  tags?: string[];
  color?: string;
  isArchived?: boolean;
}

export interface SearchRequest {
  query: string;
  page?: number;
  limit?: number;
  tags?: string[];
  collaborators?: string[];
}

export interface AddCollaboratorRequest {
  email: string;
  permissions?: 'read' | 'write' | 'admin';
}

// Authentication types
export interface AuthToken {
  token: string;
  expiresAt: Date;
  userId: string;
}

export interface BiometricAuth {
  isAvailable: boolean;
  isEnabled: boolean;
  type: 'fingerprint' | 'faceid' | 'none';
}

// App state types
export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  theme: Theme;
  biometricAuth: BiometricAuth;
  offlineMode: boolean;
}

export interface NotesState {
  notes: Note[];
  currentNote: Note | null;
  collaborators: CollaborationSession[];
  searchResults: SearchResult[];
  isLoading: boolean;
  error: string | null;
}

// Error types
export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  ENCRYPTION_ERROR = 'ENCRYPTION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: any;
}

// Constants
export const DEFAULT_THEME: Theme = {
  id: 'default',
  name: 'Default',
  colors: {
    primary: '#007AFF',
    secondary: '#5856D6',
    background: '#FFFFFF',
    surface: '#F2F2F7',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#C6C6C8',
    error: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',
  },
  isDark: false,
};

export const DARK_THEME: Theme = {
  id: 'dark',
  name: 'Dark',
  colors: {
    primary: '#0A84FF',
    secondary: '#5E5CE6',
    background: '#000000',
    surface: '#1C1C1E',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    border: '#38383A',
    error: '#FF453A',
    success: '#32D74B',
    warning: '#FF9F0A',
  },
  isDark: true,
};

export const API_ENDPOINTS = {
  AUTH: {
    VERIFY: '/auth/verify',
    REFRESH: '/auth/refresh',
  },
  NOTES: {
    BASE: '/notes',
    BY_ID: (id: string) => `/notes/${id}`,
    COLLABORATORS: (id: string) => `/notes/${id}/collaborators`,
    COLLABORATOR: (noteId: string, userId: string) => `/notes/${noteId}/collaborators/${userId}`,
  },
  FILES: {
    UPLOAD_URL: '/files/upload-url',
    BY_ID: (id: string) => `/files/${id}`,
  },
  SEARCH: '/search',
} as const; 