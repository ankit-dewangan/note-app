import { create } from 'zustand';
import { apiService } from '../services/apiService';
import { decryptNoteContent, encryptNoteContent } from '../utils/encryption';
import * as SecureStore from 'expo-secure-store';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  createdBy: string;
  collaborators: string[];
  createdAt: Date;
  updatedAt: Date;
  _id?: string;
}

interface NotesState {
  notes: Note[];
  currentNote: Note | null;
  isLoading: boolean;
  error: string | null;
}

interface NotesActions {
  fetchNotes: () => Promise<void>;
  fetchNote: (id: string) => Promise<void>;
  createNote: (note: Partial<Note>) => Promise<void>;
  updateNote: (id: string, note: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  updateNoteContent: (id: string, content: string) => void;
  createSampleNotes: () => Promise<void>;
  setCurrentNote: (note: Note | null) => void;
}

export const useNotesStore = create<NotesState & NotesActions>((set, get) => ({
  notes: [],
  currentNote: null,
  isLoading: false,
  error: null,

  fetchNotes: async () => {
    try {
      set({ isLoading: true, error: null });
      const notes = await apiService.getNotes();
      
      // Decrypt and process notes
      const processedNotes = await Promise.all(
        notes.map(async (note: any) => {
          try {
            const decryptedContent = await decryptNoteContent(note.content);
            return {
              ...note,
              id: note._id || note.id,
              content: decryptedContent,
            } as Note;
          } catch (error) {
            console.error('Error decrypting note:', error);
            return {
              ...note,
              id: note._id || note.id,
              content: note.content, // Use original content if decryption fails
            } as Note;
          }
        })
      );
      
      set({ notes: processedNotes, isLoading: false });
    } catch (error) {
      console.error('Error fetching notes:', error);
      set({ error: 'Failed to fetch notes', isLoading: false });
    }
  },

  fetchNote: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      const note = await apiService.getNote(id);
      
      // Decrypt note content
      let decryptedContent = note.content;
      try {
        console.log('Attempting to decrypt note content for note:', id);
        decryptedContent = await decryptNoteContent(note.content);
        console.log('Note content decryption completed for note:', id);
      } catch (error) {
        console.error('Error decrypting note content for note:', id, error);
        // Use original content if decryption fails
        decryptedContent = note.content;
      }
      
      const processedNote = {
        ...note,
        id: (note as any)._id || note.id,
        content: decryptedContent,
      } as Note;
      
      set({ currentNote: processedNote, isLoading: false });
    } catch (error) {
      console.error('Error fetching note:', error);
      set({ error: 'Failed to fetch note', isLoading: false });
    }
  },

  createNote: async (note) => {
    try {
      set({ isLoading: true, error: null });
      
      // Encrypt the content before sending to API
      const encryptedContent = await encryptNoteContent(note.content || '');
      
      const newNote = await apiService.createNote({
        title: note.title || 'Untitled Note',
        content: encryptedContent,
        tags: note.tags || [],
      });
      
      const processedNote = {
        ...newNote,
        id: (newNote as any)._id || newNote.id,
        content: note.content || '', // Store decrypted content in local state
      } as Note;
      
      set(state => ({
        notes: [processedNote, ...state.notes],
        currentNote: processedNote,
        isLoading: false
      }));
    } catch (error) {
      console.error('Error creating note:', error);
      set({ error: 'Failed to create note', isLoading: false });
    }
  },

  updateNote: async (id, note) => {
    try {
      set({ isLoading: true, error: null });
      
      // Encrypt the content before sending to API
      let encryptedContent = note.content;
      if (note.content !== undefined) {
        encryptedContent = await encryptNoteContent(note.content);
      }
      
      const updatedNote = await apiService.updateNote(id, {
        ...note,
        content: encryptedContent,
      });
      
      const processedNote = {
        ...updatedNote,
        id: (updatedNote as any)._id || updatedNote.id,
        content: note.content || updatedNote.content, // Store decrypted content in local state
      } as Note;
      
      set(state => ({
        notes: state.notes.map(n => n.id === id ? processedNote : n),
        currentNote: state.currentNote?.id === id ? processedNote : state.currentNote,
        isLoading: false
      }));
    } catch (error) {
      console.error('Error updating note:', error);
      set({ error: 'Failed to update note', isLoading: false });
    }
  },

  deleteNote: async (id) => {
    try {
      set({ isLoading: true, error: null });
      await apiService.deleteNote(id);
      
      set(state => ({
        notes: state.notes.filter(n => n.id !== id),
        currentNote: state.currentNote?.id === id ? null : state.currentNote,
        isLoading: false
      }));
    } catch (error) {
      console.error('Error deleting note:', error);
      set({ error: 'Failed to delete note', isLoading: false });
    }
  },

  updateNoteContent: (id, content) => {
    set(state => ({
      notes: state.notes.map(note => 
        note.id === id ? { ...note, content } : note
      ),
      currentNote: state.currentNote?.id === id ? { ...state.currentNote, content } : state.currentNote,
    }));
  },

  setCurrentNote: (note) => {
    set({ currentNote: note });
  },

  createSampleNotes: async () => {
    try {
      set({ isLoading: true, error: null });
      const token = await SecureStore.getItemAsync('auth_token');
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/notes/sample`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to create sample notes');
      }
      
      // Refresh notes after creating samples
      await get().fetchNotes();
    } catch (error) {
      console.error('Error creating sample notes:', error);
      set({ error: 'Failed to create sample notes', isLoading: false });
      throw error;
    }
  },
}));

 