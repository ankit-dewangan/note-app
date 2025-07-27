import { create } from 'zustand';
import { apiService } from '../services/apiService';
import { encryptNoteContent, decryptNoteContent } from '../utils/encryption';
import { useAuthContext } from '../contexts/AuthContext';

export interface Note {
  id: string;
  _id?: string; // MongoDB _id field
  title: string;
  content: string;
  createdBy: string;
  collaborators: string[];
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isArchived?: boolean;
  tags?: string[];
  color?: string;
}

interface NotesState {
  notes: Note[];
  currentNote: Note | null;
  isLoading: boolean;
  error: string | null;
  searchResults: any[];
  isSearching: boolean;
}

interface NotesActions {
  // Basic CRUD operations
  fetchNotes: () => Promise<void>;
  fetchNote: (id: string) => Promise<void>;
  createNote: (noteData: { title: string; content: string; tags?: string[]; color?: string }) => Promise<void>;
  updateNote: (id: string, noteData: { title?: string; content?: string; tags?: string[]; color?: string }) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  
  // Collaboration
  addCollaborator: (noteId: string, userId: string) => Promise<void>;
  removeCollaborator: (noteId: string, userId: string) => Promise<void>;
  
  // Search
  searchNotes: (query: string) => Promise<void>;
  clearSearch: () => void;
  
  // State management
  setCurrentNote: (note: Note | null) => void;
  clearError: () => void;
  
  // Real-time collaboration
  updateNoteContent: (noteId: string, content: string) => void;
}

export const useNotesStore = create<NotesState & NotesActions>((set, get) => ({
  notes: [],
  currentNote: null,
  isLoading: false,
  error: null,
  searchResults: [],
  isSearching: false,

  fetchNotes: async () => {
    try {
      console.log('Starting fetchNotes...');
      set({ isLoading: true, error: null });
      
      console.log('Calling apiService.getNotes()...');
      const notes = await apiService.getNotes();
      console.log('Received notes from API:', notes);
      
      // Process notes - handle both encrypted and non-encrypted content
      console.log('Processing note contents...');
      const processedNotes = await Promise.all(
        notes.map(async (note: any) => {
          console.log('Processing note:', note._id || note.id);
          
          // Check if content is encrypted (base64 encoded)
          let processedContent = note.content;
          if (note.content && note.content.length > 0) {
            try {
              // Try to decrypt if it looks like encrypted content
              if (note.content.includes('==') || note.content.length > 50) {
                const decryptedContent = await decryptNoteContent(note.content);
                processedContent = decryptedContent;
              } else {
                // Content is not encrypted, use as-is
                processedContent = note.content;
              }
            } catch (error) {
              console.log('Content decryption failed, using original content');
              processedContent = note.content;
            }
          }
          
          return {
            ...note,
            id: note._id || note.id, // Use _id from MongoDB or fallback to id
            content: processedContent,
          } as Note;
        })
      );
      
      console.log('Setting notes in store:', processedNotes);
      set({ notes: processedNotes, isLoading: false });
      console.log('fetchNotes completed successfully');
    } catch (error) {
      console.error('Error in fetchNotes:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch notes',
        isLoading: false 
      });
    }
  },

  fetchNote: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      const note = await apiService.getNote(id);
      
      // Process note content - handle both encrypted and non-encrypted content
      let processedContent = note.content;
      if (note.content && note.content.length > 0) {
        try {
          // Try to decrypt if it looks like encrypted content
          if (note.content.includes('==') || note.content.length > 50) {
            processedContent = await decryptNoteContent(note.content);
          } else {
            // Content is not encrypted, use as-is
            processedContent = note.content;
          }
        } catch (error) {
          console.log('Content decryption failed, using original content');
          processedContent = note.content;
        }
      }
      
      const processedNote = {
        ...note,
        id: (note as any)._id || note.id, // Use _id from MongoDB or fallback to id
        content: processedContent,
      } as Note;
      
      set({ currentNote: processedNote, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch note',
        isLoading: false 
      });
    }
  },

  createNote: async (noteData) => {
    try {
      set({ isLoading: true, error: null });
      
      // Encrypt note content
      const encryptedContent = await encryptNoteContent(noteData.content);
      
      const note = await apiService.createNote({
        ...noteData,
        content: encryptedContent,
      });
      
      // Process the created note
      const processedNote = {
        ...note,
        id: (note as any)._id || note.id, // Use _id from MongoDB or fallback to id
        content: noteData.content, // Use original content for local state
      } as Note;
      
      set(state => ({
        notes: [processedNote, ...state.notes],
        currentNote: processedNote,
        isLoading: false,
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create note',
        isLoading: false 
      });
    }
  },

  updateNote: async (id: string, noteData) => {
    try {
      set({ isLoading: true, error: null });
      
      // Encrypt content if provided
      let encryptedContent: string | undefined;
      if (noteData.content) {
        encryptedContent = await encryptNoteContent(noteData.content);
      }
      
      const note = await apiService.updateNote(id, {
        ...noteData,
        content: encryptedContent,
      });
      
      // Process the updated note
      const processedNote = {
        ...note,
        id: (note as any)._id || note.id, // Use _id from MongoDB or fallback to id
        content: noteData.content || get().currentNote?.content || '',
      } as Note;
      
      set(state => ({
        notes: state.notes.map(n => n.id === id ? processedNote : n),
        currentNote: state.currentNote?.id === id ? processedNote : state.currentNote,
        isLoading: false,
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update note',
        isLoading: false 
      });
    }
  },

  deleteNote: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      await apiService.deleteNote(id);
      
      set(state => ({
        notes: state.notes.filter(n => n.id !== id),
        currentNote: state.currentNote?.id === id ? null : state.currentNote,
        isLoading: false,
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete note',
        isLoading: false 
      });
    }
  },

  addCollaborator: async (noteId: string, userId: string) => {
    try {
      set({ error: null });
      await apiService.addCollaborator(noteId, userId);
      
      // Update local state
      set(state => ({
        notes: state.notes.map(note => 
          note.id === noteId 
            ? { ...note, collaborators: [...note.collaborators, userId] }
            : note
        ),
        currentNote: state.currentNote?.id === noteId 
          ? { ...state.currentNote, collaborators: [...state.currentNote.collaborators, userId] }
          : state.currentNote,
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add collaborator'
      });
    }
  },

  removeCollaborator: async (noteId: string, userId: string) => {
    try {
      set({ error: null });
      await apiService.removeCollaborator(noteId, userId);
      
      // Update local state
      set(state => ({
        notes: state.notes.map(note => 
          note.id === noteId 
            ? { ...note, collaborators: note.collaborators.filter(id => id !== userId) }
            : note
        ),
        currentNote: state.currentNote?.id === noteId 
          ? { ...state.currentNote, collaborators: state.currentNote.collaborators.filter(id => id !== userId) }
          : state.currentNote,
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to remove collaborator'
      });
    }
  },

  searchNotes: async (query: string) => {
    try {
      set({ isSearching: true, error: null });
      const response = await apiService.searchNotes(query);
      
      // Process search results - handle both encrypted and non-encrypted content
      const processedResults = await Promise.all(
        response.data.map(async (result: any) => {
          let processedContent = result.content;
          if (result.content && result.content.length > 0) {
            try {
              // Try to decrypt if it looks like encrypted content
              if (result.content.includes('==') || result.content.length > 50) {
                processedContent = await decryptNoteContent(result.content);
              } else {
                // Content is not encrypted, use as-is
                processedContent = result.content;
              }
            } catch (error) {
              console.log('Content decryption failed, using original content');
              processedContent = result.content;
            }
          }
          
          return {
            ...result,
            id: result._id || result.id, // Use _id from MongoDB or fallback to id
            content: processedContent,
          };
        })
      );
      
      set({ 
        searchResults: processedResults,
        isSearching: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Search failed',
        isSearching: false 
      });
    }
  },

  clearSearch: () => {
    set({ searchResults: [], isSearching: false });
  },

  setCurrentNote: (note) => {
    set({ currentNote: note });
  },

  clearError: () => {
    set({ error: null });
  },

  updateNoteContent: (noteId: string, content: string) => {
    set(state => ({
      notes: state.notes.map(note =>
        note.id === noteId ? { ...note, content: content } : note
      ),
      currentNote: state.currentNote?.id === noteId ? { ...state.currentNote, content: content } : state.currentNote,
    }));
  },
}));

 