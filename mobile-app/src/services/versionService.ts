import { apiService } from './apiService';

export interface NoteVersion {
  id: string;
  noteId: string;
  version: number;
  title: string;
  content: string;
  delta?: any;
  createdBy: string;
  createdAt: Date;
  changeType: 'create' | 'update' | 'delete' | 'restore';
  changeDescription?: string;
  collaborators: string[];
  tags?: string[];
  color?: string;
}

export interface VersionComparison {
  version1: NoteVersion;
  version2: NoteVersion;
  differences: {
    title: boolean;
    content: boolean;
    tags: boolean;
    color: boolean;
  };
  contentDiff: {
    length1: number;
    length2: number;
    added: number;
    removed: number;
  };
}

class VersionService {
  // Get version history for a note
  async getVersionHistory(noteId: string): Promise<NoteVersion[]> {
    try {
      const response = await apiService.makeRequest<{ success: boolean; data: NoteVersion[] }>(`/versions/${noteId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching version history:', error);
      throw new Error('Failed to fetch version history');
    }
  }

  // Create a new version
  async createVersion(noteId: string, title: string, content: string, delta?: any, changeType?: string, changeDescription?: string): Promise<NoteVersion> {
    try {
      const response = await apiService.makeRequest<{ success: boolean; data: NoteVersion }>('/versions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          noteId,
          title,
          content,
          delta,
          changeType: changeType || 'update',
          changeDescription,
        }),
      });
      return response.data;
    } catch (error) {
      console.error('Error creating version:', error);
      throw new Error('Failed to create version');
    }
  }

  // Get a specific version
  async getVersion(noteId: string, versionNumber: number): Promise<NoteVersion> {
    try {
      const response = await apiService.makeRequest<{ success: boolean; data: NoteVersion }>(`/versions/${noteId}/${versionNumber}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching version:', error);
      throw new Error('Failed to fetch version');
    }
  }

  // Restore a note to a specific version
  async restoreVersion(noteId: string, versionNumber: number): Promise<{ note: any; restoredVersion: NoteVersion }> {
    try {
      const response = await apiService.makeRequest<{ success: boolean; data: { note: any; restoredVersion: NoteVersion } }>(`/versions/${noteId}/${versionNumber}/restore`, {
        method: 'POST',
      });
      return response.data;
    } catch (error) {
      console.error('Error restoring version:', error);
      throw new Error('Failed to restore version');
    }
  }

  // Compare two versions
  async compareVersions(noteId: string, version1: number, version2: number): Promise<VersionComparison> {
    try {
      const response = await apiService.makeRequest<{ success: boolean; data: VersionComparison }>(`/versions/${noteId}/compare/${version1}/${version2}`);
      return response.data;
    } catch (error) {
      console.error('Error comparing versions:', error);
      throw new Error('Failed to compare versions');
    }
  }

  // Clean up old versions
  async cleanupOldVersions(noteId: string): Promise<{ deletedCount: number }> {
    try {
      const response = await apiService.makeRequest<{ success: boolean; data: { deletedCount: number } }>(`/versions/${noteId}/cleanup`, {
        method: 'DELETE',
      });
      return response.data;
    } catch (error) {
      console.error('Error cleaning up old versions:', error);
      throw new Error('Failed to cleanup old versions');
    }
  }

  // Format version change description
  formatChangeDescription(version: NoteVersion): string {
    if (version.changeDescription) {
      return version.changeDescription;
    }

    const date = new Date(version.createdAt).toLocaleString();
    switch (version.changeType) {
      case 'create':
        return `Created on ${date}`;
      case 'update':
        return `Updated on ${date}`;
      case 'delete':
        return `Deleted on ${date}`;
      case 'restore':
        return `Restored on ${date}`;
      default:
        return `Modified on ${date}`;
    }
  }

  // Get user-friendly version number
  formatVersionNumber(version: number): string {
    return `v${version}`;
  }

  // Check if a version is recent (within last 24 hours)
  isRecentVersion(version: NoteVersion): boolean {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return new Date(version.createdAt) > oneDayAgo;
  }
}

export const versionService = new VersionService(); 