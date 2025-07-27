import { io, Socket } from 'socket.io-client';
import { apiService } from './apiService';
import * as SecureStore from 'expo-secure-store';

export interface OperationalTransform {
  type: 'insert' | 'delete' | 'retain';
  position: number;
  content?: string;
  length: number;
  userId: string;
  timestamp: number;
}

export interface CursorPosition {
  userId: string;
  position: { x: number; y: number };
  username: string;
  color: string;
}

export interface CollaborationState {
  participants: string[];
  cursors: CursorPosition[];
  version: number;
}

const WebSocketEvents = {
  JOIN_NOTE: 'join-note',
  LEAVE_NOTE: 'leave-note',
  CONTENT_CHANGE: 'content-change',
  CURSOR_POSITION: 'cursor-position',
  PARTICIPANT_JOINED: 'participant-joined',
  PARTICIPANT_LEFT: 'participant-left',
  OPERATION_APPLIED: 'operation-applied',
  FULL_CONTENT_UPDATE: 'full-content-update',
  ERROR: 'error',
} as const;

class CollaborationService {
  private socket: Socket | null = null;
  private currentNoteId: string | null = null;
  private userId: string | null = null;
  private username: string | null = null;
  private onContentChange: ((operation: OperationalTransform) => void) | null = null;
  private onCursorChange: ((cursors: CursorPosition[]) => void) | null = null;
  private onParticipantChange: ((participants: string[]) => void) | null = null;
  private onError: ((error: string) => void) | null = null;
  private isInitialized: boolean = false;
  private noteSpecificListeners: Map<string, {
    onContentChange: ((operation: any) => void) | null;
    onCursorChange: ((cursors: any) => void) | null;
  }> = new Map();

  constructor() {
    // Initialize socket when first needed
  }

  private async testBackendConnection(): Promise<boolean> {
    try {
      const API_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://10.40.1.77:3001';
      console.log('Testing backend connection to:', `${API_URL}/health`);
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
      });
      console.log('Backend connection test response:', response.status);
      return response.ok;
    } catch (error) {
      console.warn('Backend not reachable:', error);
      return false;
    }
  }

  private async ensureInitialized() {
    if (!this.isInitialized) {
      // Test if backend is reachable first
      console.log('Testing backend connection...');
      const isBackendReachable = await this.testBackendConnection();
      if (!isBackendReachable) {
        console.warn('Backend not reachable, skipping collaboration setup');
        this.isInitialized = true; // Mark as initialized to prevent retries
        return;
      }
      
      await this.setupSocket();
      this.isInitialized = true;
    }
  }

  private async setupSocket() {
    const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://10.40.1.77:3001';
    
    console.log('Setting up collaboration socket with URL:', SOCKET_URL);
    
    try {
      // Get auth token
      const token = await SecureStore.getItemAsync('auth_token');
      console.log('Auth token available:', !!token);
      
      this.socket = io(SOCKET_URL, {
        transports: ['websocket'],
        autoConnect: false,
        timeout: 10000,
        auth: {
          token: token || '',
        },
      });

      this.socket.on('connect', () => {
        console.log('Connected to collaboration server');
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from collaboration server');
      });

      this.socket.on('connect_error', (error) => {
        console.error('Collaboration socket connection error:', error);
        console.error('Error details:', {
          message: error.message,
          type: error.constructor.name,
        });
      });

      this.socket.on(WebSocketEvents.CONTENT_CHANGE, (operation: OperationalTransform) => {
        console.log('Received content change:', operation);
        if (this.onContentChange) {
          this.onContentChange(operation);
        }
      });

      this.socket.on(WebSocketEvents.FULL_CONTENT_UPDATE, (data: {
        content: string;
        userId: string;
        timestamp: number;
        noteId: string;
      }) => {
        console.log('Received full content update from user:', data.userId, 'for note:', data.noteId);
        
        // Only trigger listener for the specific note
        const listener = this.noteSpecificListeners.get(data.noteId);
        if (listener && listener.onContentChange) {
          listener.onContentChange({
            type: 'full-update',
            content: data.content,
            userId: data.userId,
            timestamp: data.timestamp,
          });
        }
      });

      this.socket.on(WebSocketEvents.CURSOR_POSITION, (data: {
        userId: string;
        position: { x: number; y: number };
        selection?: { start: number; end: number };
        username: string;
        color: string;
        timestamp: number;
        noteId: string;
      }) => {
        console.log('Received cursor position from user:', data.userId, 'for note:', data.noteId);
        
        // Only trigger listener for the specific note
        const listener = this.noteSpecificListeners.get(data.noteId);
        if (listener && listener.onCursorChange) {
          listener.onCursorChange(data);
        }
      });

      this.socket.on('user-joined', (data: {
        userId: string;
        userName: string;
        activeUsers: Array<{ userId: string; userName: string }>;
      }) => {
        console.log('User joined:', data.userName);
        if (this.onParticipantChange) {
          this.onParticipantChange([data.userName]);
        }
      });

      this.socket.on('user-left', (data: { userId: string }) => {
        console.log('User left:', data.userId);
        if (this.onParticipantChange) {
          this.onParticipantChange([]);
        }
      });

      this.socket.on(WebSocketEvents.ERROR, (error: string) => {
        console.error('Collaboration error received:', error);
        if (this.onError) {
          this.onError(error);
        }
      });
    } catch (error) {
      console.error('Error setting up collaboration socket:', error);
    }
  }

  async joinNote(noteId: string, userId: string, username: string): Promise<void> {
    console.log('Joining note:', noteId, userId, username);
    try {
      // Ensure socket is initialized
      await this.ensureInitialized();
      
      this.currentNoteId = noteId;
      this.userId = userId;
      this.username = username;

      if (!this.socket) {
        console.error('Socket not initialized');
        throw new Error('Socket not initialized');
      }

      // Connect if not already connected
      if (!this.socket.connected) {
        console.log('Connecting to collaboration server...');
        await new Promise<void>((resolve, reject) => {
          if (!this.socket) {
            reject(new Error('Socket not available'));
            return;
          }

          this.socket!.connect();
          
          const timeout = setTimeout(() => {
            reject(new Error('Connection timeout'));
          }, 5000);

          this.socket!.once('connect', () => {
            clearTimeout(timeout);
            resolve();
          });

          this.socket!.once('connect_error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
      }

      // Join the note room
      console.log('Joining note room:', noteId);
      this.socket.emit(WebSocketEvents.JOIN_NOTE, {
        noteId,
        userId,
        username,
      });

      console.log('Successfully joined note room');
    } catch (error) {
      console.error('Error joining note:', error);
      throw error;
    }
  }

  async leaveNote(): Promise<void> {
    try {
      if (this.socket && this.socket.connected && this.currentNoteId) {
        console.log('Leaving note room:', this.currentNoteId);
        
        this.socket.emit(WebSocketEvents.LEAVE_NOTE, {
          noteId: this.currentNoteId,
          userId: this.userId,
        });
      }

      this.currentNoteId = null;
      this.userId = null;
      this.username = null;
      
      console.log('Successfully left note room');
    } catch (error) {
      console.error('Error leaving note:', error);
      // Don't throw error for cleanup operations
    }
  }

  sendContentChange(fullContent: string): void {
    try {
      if (this.socket && this.socket.connected && this.currentNoteId) {
        console.log('Sending full content update for note:', this.currentNoteId);
        this.socket.emit(WebSocketEvents.FULL_CONTENT_UPDATE, {
          noteId: this.currentNoteId,
          content: fullContent,
          userId: this.userId,
          timestamp: Date.now(),
        });
      } else {
        console.warn('Cannot send content change: socket not connected or no active note');
      }
    } catch (error) {
      console.error('Error sending content change:', error);
    }
  }

  sendCursorPosition(position: { x: number; y: number }, selection?: { start: number; end: number }): void {
    if (this.socket?.connected && this.currentNoteId && this.userId) {
      const cursorData = {
        noteId: this.currentNoteId,
        cursor: {
          userId: this.userId,
          position,
          selection,
          username: this.username || 'Unknown',
          color: this.getUserColor(this.userId),
          timestamp: Date.now(),
        },
      };
      
      console.log('Sending cursor position for note:', this.currentNoteId);
      this.socket.emit(WebSocketEvents.CURSOR_POSITION, cursorData);
    }
  }

  private getUserColor(userId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    ];
    const index = userId.charCodeAt(0) % colors.length;
    return colors[index];
  }

  // Operational Transform functions
  createInsertOperation(position: number, content: string): OperationalTransform {
    return {
      type: 'insert',
      position,
      content,
      length: content.length,
      userId: this.userId || '',
      timestamp: Date.now(),
    };
  }

  createDeleteOperation(position: number, length: number): OperationalTransform {
    return {
      type: 'delete',
      position,
      length,
      userId: this.userId || '',
      timestamp: Date.now(),
    };
  }

  createRetainOperation(length: number): OperationalTransform {
    return {
      type: 'retain',
      position: 0,
      length,
      userId: this.userId || '',
      timestamp: Date.now(),
    };
  }

  applyOperation(text: string, operation: OperationalTransform): string {
    switch (operation.type) {
      case 'insert':
        return text.slice(0, operation.position) + operation.content + text.slice(operation.position);
      case 'delete':
        return text.slice(0, operation.position) + text.slice(operation.position + operation.length);
      case 'retain':
        return text;
      default:
        return text;
    }
  }

  transformOperations(op1: OperationalTransform, op2: OperationalTransform): [OperationalTransform, OperationalTransform] {
    if (op1.type === 'insert' && op2.type === 'insert') {
      if (op1.position <= op2.position) {
        return [op1, { ...op2, position: op2.position + op1.length }];
      } else {
        return [{ ...op1, position: op1.position + op2.length }, op2];
      }
    }

    if (op1.type === 'delete' && op2.type === 'delete') {
      if (op1.position <= op2.position) {
        return [op1, { ...op2, position: op2.position - op1.length }];
      } else {
        return [{ ...op1, position: op1.position - op2.length }, op2];
      }
    }

    if (op1.type === 'insert' && op2.type === 'delete') {
      if (op1.position <= op2.position) {
        return [op1, { ...op2, position: op2.position + op1.length }];
      } else {
        return [{ ...op1, position: op1.position - op2.length }, op2];
      }
    }

    if (op1.type === 'delete' && op2.type === 'insert') {
      if (op1.position <= op2.position) {
        return [op1, { ...op2, position: op2.position - op1.length }];
      } else {
        return [{ ...op1, position: op1.position + op2.length }, op2];
      }
    }

    return [op1, op2];
  }

  // Event listeners
  setContentChangeListener(callback: (operation: OperationalTransform) => void, noteId: string): void {
    if (!this.noteSpecificListeners.has(noteId)) {
      this.noteSpecificListeners.set(noteId, {
        onContentChange: null,
        onCursorChange: null,
      });
    }
    const listeners = this.noteSpecificListeners.get(noteId)!;
    listeners.onContentChange = callback;
  }

  setCursorChangeListener(callback: (cursors: CursorPosition[]) => void, noteId: string): void {
    if (!this.noteSpecificListeners.has(noteId)) {
      this.noteSpecificListeners.set(noteId, {
        onContentChange: null,
        onCursorChange: null,
      });
    }
    const listeners = this.noteSpecificListeners.get(noteId)!;
    listeners.onCursorChange = callback;
  }

  setParticipantChangeListener(callback: (participants: string[]) => void): void {
    this.onParticipantChange = callback;
  }

  setErrorListener(callback: (error: string) => void): void {
    this.onError = callback;
  }

  // Cleanup specific note listeners
  clearNoteListeners(noteId: string): void {
    this.noteSpecificListeners.delete(noteId);
  }

  // Cleanup
  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.currentNoteId = null;
    this.userId = null;
    this.username = null;
    this.onContentChange = null;
    this.onCursorChange = null;
    this.onParticipantChange = null;
    this.onError = null;
    this.noteSpecificListeners.clear();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getCurrentNoteId(): string | null {
    return this.currentNoteId;
  }
}

export const collaborationService = new CollaborationService(); 