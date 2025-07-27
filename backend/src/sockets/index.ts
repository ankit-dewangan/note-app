import { Server } from 'socket.io';
import { logger } from '../utils/logger';

interface CollaborationSession {
  noteId: string;
  userId: string;
  userName: string;
  cursorPosition?: number;
  lastActive: Date;
}

const activeSessions = new Map<string, CollaborationSession[]>();

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.id}`);

    // Join a note for collaboration
    socket.on('join-note', (data: { noteId: string; userId: string; userName: string }) => {
      const { noteId, userId, userName } = data;
      
      // Join the room for this note
      socket.join(noteId);
      
      // Add to active sessions
      if (!activeSessions.has(noteId)) {
        activeSessions.set(noteId, []);
      }
      
      const sessions = activeSessions.get(noteId)!;
      const existingSession = sessions.find(s => s.userId === userId);
      
      if (!existingSession) {
        sessions.push({
          noteId,
          userId,
          userName,
          lastActive: new Date()
        });
      } else {
        existingSession.lastActive = new Date();
      }
      
      // Notify other users in the room
      socket.to(noteId).emit('user-joined', {
        userId,
        userName,
        activeUsers: sessions.map(s => ({ userId: s.userId, userName: s.userName }))
      });
      
      logger.info(`User ${userName} joined note: ${noteId}`);
    });

    // Leave a note
    socket.on('leave-note', (data: { noteId: string; userId: string }) => {
      const { noteId, userId } = data;
      
      socket.leave(noteId);
      
      // Remove from active sessions
      const sessions = activeSessions.get(noteId);
      if (sessions) {
        const index = sessions.findIndex(s => s.userId === userId);
        if (index !== -1) {
          sessions.splice(index, 1);
          
          if (sessions.length === 0) {
            activeSessions.delete(noteId);
          }
        }
      }
      
      // Notify other users
      socket.to(noteId).emit('user-left', { userId });
      
      logger.info(`User ${userId} left note: ${noteId}`);
    });

    // Handle content changes
    socket.on('content-change', (data: {
      noteId: string;
      userId: string;
      operation: {
        type: 'insert' | 'delete' | 'retain';
        position: number;
        length: number;
        content?: string;
        timestamp: number;
      };
    }) => {
      const { noteId, userId, operation } = data;
      
      console.log(`Content change in note ${noteId} by user ${userId}:`, operation);
      
      // Broadcast to other users in the room
      socket.to(noteId).emit('content-change', {
        userId,
        operation
      });
      
      // Also emit to the sender for confirmation
      socket.emit('content-change-received', {
        userId,
        operation,
        timestamp: Date.now()
      });
      
      logger.debug(`Content change in note ${noteId} by user ${userId}`);
    });

    // Handle full content updates
    socket.on('full-content-update', (data: {
      noteId: string;
      userId: string;
      content: string;
      timestamp: number;
    }) => {
      const { noteId, userId, content } = data;
      
      console.log(`Full content update in note ${noteId} by user ${userId}, content length: ${content.length}`);
      
      // Broadcast to other users in the room
      socket.to(noteId).emit('full-content-update', {
        userId,
        content,
        timestamp: Date.now()
      });
      
      // Also emit to the sender for confirmation
      socket.emit('full-content-update-received', {
        userId,
        content,
        timestamp: Date.now()
      });
      
      logger.debug(`Full content update in note ${noteId} by user ${userId}`);
    });

    // Handle cursor position updates
    socket.on('cursor-position', (data: {
      noteId: string;
      cursor: {
        userId: string;
        position: { x: number; y: number };
        selection?: { start: number; end: number };
        username: string;
        color: string;
        timestamp: number;
      };
    }) => {
      const { noteId, cursor } = data;
      
      console.log(`Cursor position update in note ${noteId} by user ${cursor.userId}`);
      
      // Broadcast to other users in the room
      socket.to(noteId).emit('cursor-position', {
        userId: cursor.userId,
        position: cursor.position,
        selection: cursor.selection,
        username: cursor.username,
        color: cursor.color,
        timestamp: cursor.timestamp
      });
      
      logger.debug(`Cursor position update in note ${noteId} by user ${cursor.userId}`);
    });

    // Handle user typing indicator
    socket.on('typing', (data: { noteId: string; userId: string; isTyping: boolean }) => {
      const { noteId, userId, isTyping } = data;
      
      socket.to(noteId).emit('user-typing', {
        userId,
        isTyping
      });
    });

    // Handle note creation/update notifications
    socket.on('note-updated', (data: { noteId: string; userId: string }) => {
      const { noteId, userId } = data;
      
      socket.to(noteId).emit('note-updated', {
        noteId,
        updatedBy: userId,
        timestamp: new Date()
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.id}`);
      
      // Clean up any sessions for this socket
      for (const [noteId, sessions] of activeSessions.entries()) {
        const disconnectedSessions = sessions.filter(s => s.userId === socket.data.user?.id);
        
        if (disconnectedSessions.length > 0) {
          // Remove disconnected sessions
          activeSessions.set(noteId, sessions.filter(s => s.userId !== socket.data.user?.id));
          
          // Notify other users
          socket.to(noteId).emit('user-disconnected', {
            userId: socket.data.user?.id
          });
        }
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('Socket error:', error);
      socket.emit('error', {
        message: 'An error occurred',
        code: 'SOCKET_ERROR'
      });
    });
  });

  // Clean up inactive sessions periodically
  setInterval(() => {
    const now = new Date();
    const timeout = 5 * 60 * 1000; // 5 minutes
    
    for (const [noteId, sessions] of activeSessions.entries()) {
      const activeSessionsForNote = sessions.filter(s => 
        now.getTime() - s.lastActive.getTime() < timeout
      );
      
      if (activeSessionsForNote.length === 0) {
        activeSessions.delete(noteId);
      } else {
        activeSessions.set(noteId, activeSessionsForNote);
      }
    }
  }, 60000); // Check every minute
}

// Helper function to get active users for a note
export function getActiveUsers(noteId: string): CollaborationSession[] {
  return activeSessions.get(noteId) || [];
}

// Helper function to broadcast to all users in a note
export function broadcastToNote(io: Server, noteId: string, event: string, data: any): void {
  io.to(noteId).emit(event, data);
} 