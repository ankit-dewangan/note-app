import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

interface Note {
  id: string;
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

interface CreateNoteData {
  title: string;
  content: string;
  tags?: string[];
  color?: string;
}

interface UpdateNoteData {
  title?: string;
  content?: string;
  tags?: string[];
  color?: string;
}

interface SearchResult {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  createdBy: string;
  collaborators: string[];
  createdAt: Date;
  updatedAt: Date;
  score: number;
  highlights: {
    title: string[];
    content: string[];
    tags: string[];
  };
  matchType: {
    title: boolean;
    content: boolean;
    tags: boolean;
  };
}

interface SearchResponse {
  success: boolean;
  data: SearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface FileUploadResponse {
  success: boolean;
  data: {
    uploadUrl: string;
    fileId: string;
    s3Key: string;
  };
}

class ApiService {
  private async getAuthToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('auth_token');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  public async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken();
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    console.log(`Making request to: ${API_BASE_URL}${endpoint}`);


    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      console.log(`Response status: ${response.status}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Response:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      
      return responseData;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // User Management
  async syncUser(userData: User, token: string): Promise<void> {
    await SecureStore.setItemAsync('auth_token', token);
    console.log('User token stored, backend will sync automatically', token);
    // The backend will handle user creation/update through authentication middleware
  }

  // Notes Management
  async getNotes(): Promise<Note[]> {
    console.log('Fetching notes from API service');
    const response = await this.makeRequest<{ success: boolean; data: Note[] }>('/notes');
    console.log('Notes fetched:', response.data);
    return response.data;
  }

  async getNote(id: string): Promise<Note> {
    const response = await this.makeRequest<{ success: boolean; data: Note }>(`/notes/${id}`);
    return response.data;
  }

  async createNote(noteData: CreateNoteData): Promise<Note> {
    const response = await this.makeRequest<{ success: boolean; data: Note }>('/notes', {
      method: 'POST',
      body: JSON.stringify(noteData),
    });
    return response.data;
  }

  async updateNote(id: string, noteData: UpdateNoteData): Promise<Note> {
    const response = await this.makeRequest<{ success: boolean; data: Note }>(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(noteData),
    });
    return response.data;
  }

  async deleteNote(id: string): Promise<void> {
    await this.makeRequest(`/notes/${id}`, {
      method: 'DELETE',
    });
  }

  // Search
  async searchNotes(
    query: string, 
    page: number = 1, 
    limit: number = 20,
    searchType: 'all' | 'title' | 'content' | 'tags' = 'all',
    tags?: string[],
    collaborators?: string[]
  ): Promise<SearchResponse> {
    const params = new URLSearchParams({
      query,
      page: page.toString(),
      limit: limit.toString(),
      searchType,
    });

    if (tags && tags.length > 0) {
      tags.forEach(tag => params.append('tags', tag));
    }

    if (collaborators && collaborators.length > 0) {
      collaborators.forEach(collaborator => params.append('collaborators', collaborator));
    }

    return this.makeRequest<SearchResponse>(`/search?${params}`);
  }

  // File Upload
  async getUploadUrl(filename: string, contentType: string, fileSize: number, noteId?: string): Promise<FileUploadResponse> {
    return this.makeRequest<FileUploadResponse>('/files/upload-url', {
      method: 'POST',
      body: JSON.stringify({ 
        filename: filename,
        originalName: filename,
        mimeType: contentType,
        size: fileSize,
        noteId: noteId
      }),
    });
  }

  async getFilesByNoteId(noteId: string): Promise<any[]> {
    const response = await this.makeRequest<{ success: boolean; data: any[] }>(`/files/note/${noteId}`);
    return response.data;
  }

  async getFileMetadata(fileId: string): Promise<any> {
    const response = await this.makeRequest<{ success: boolean; data: any }>(`/files/${fileId}`);
    return response.data;
  }

  async uploadFile(file: File, signedUrl: string): Promise<void> {
    await fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });
  }

  async deleteFile(fileKey: string): Promise<void> {
    await this.makeRequest(`/files/${fileKey}`, {
      method: 'DELETE',
    });
  }

  async createSampleFiles(noteId: string): Promise<any[]> {
    const response = await this.makeRequest<{ success: boolean; data: any[] }>('/files/sample', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ noteId }),
    });
    return response.data;
  }

  // Real-time Collaboration
  async joinNote(noteId: string): Promise<void> {
    await this.makeRequest(`/notes/${noteId}/join`, {
      method: 'POST',
    });
  }

  async leaveNote(noteId: string): Promise<void> {
    await this.makeRequest(`/notes/${noteId}/leave`, {
      method: 'POST',
    });
  }

  // Socket.io events for real-time collaboration
  async sendContentChange(noteId: string, operation: any): Promise<void> {
    await this.makeRequest(`/notes/${noteId}/content-change`, {
      method: 'POST',
      body: JSON.stringify({ operation }),
    });
  }

  async sendCursorPosition(noteId: string, position: { x: number; y: number }): Promise<void> {
    await this.makeRequest(`/notes/${noteId}/cursor-position`, {
      method: 'POST',
      body: JSON.stringify({ position }),
    });
  }
}

export const apiService = new ApiService(); 