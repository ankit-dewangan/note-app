import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { apiService } from './apiService';
import { encryptData } from '../utils/encryption';

export interface FileMetadata {
  id: string;
  _id?: string; // MongoDB _id field
  filename: string;
  originalName: string;
  contentType: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
  isEncrypted: boolean;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

class FileUploadService {
  private maxFileSize = 50 * 1024 * 1024; // 50MB
  private allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'];
  private allowedDocumentTypes = [
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/rtf',
    'text/html',
    'application/json',
    'application/xml',
  ];
  private allowedVideoTypes = [
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/wmv',
    'video/flv',
    'video/webm',
    'video/mkv',
  ];
  private allowedAudioTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/aac',
    'audio/flac',
    'audio/m4a',
  ];

  async pickImage(): Promise<File | null> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        
        return new File([blob], `image_${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
      }

      return null;
    } catch (error) {
      console.error('Error picking image:', error);
      throw new Error('Failed to pick image');
    }
  }

  async pickDocument(): Promise<File | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        
        return new File([blob], asset.name, {
          type: asset.mimeType || 'application/octet-stream',
        });
      }

      return null;
    } catch (error) {
      console.error('Error picking document:', error);
      throw new Error('Failed to pick document');
    }
  }

  async pickVideo(): Promise<File | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        
        return new File([blob], asset.name, {
          type: asset.mimeType || 'video/mp4',
        });
      }

      return null;
    } catch (error) {
      console.error('Error picking video:', error);
      throw new Error('Failed to pick video');
    }
  }

  async pickAudio(): Promise<File | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        
        return new File([blob], asset.name, {
          type: asset.mimeType || 'audio/mpeg',
        });
      }

      return null;
    } catch (error) {
      console.error('Error picking audio:', error);
      throw new Error('Failed to pick audio');
    }
  }

  async pickAnyFile(): Promise<File | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        
        return new File([blob], asset.name, {
          type: asset.mimeType || 'application/octet-stream',
        });
      }

      return null;
    } catch (error) {
      console.error('Error picking file:', error);
      throw new Error('Failed to pick file');
    }
  }

  async takePhoto(): Promise<File | null> {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Camera permission not granted');
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        
        return new File([blob], `photo_${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
      }

      return null;
    } catch (error) {
      console.error('Error taking photo:', error);
      throw new Error('Failed to take photo');
    }
  }

  validateFile(file: File): { isValid: boolean; error?: string } {
    // Check file size
    if (file.size > this.maxFileSize) {
      return {
        isValid: false,
        error: `File size must be less than ${this.formatFileSize(this.maxFileSize)}`,
      };
    }

    // Check file type
    const allAllowedTypes = [
      ...this.allowedImageTypes,
      ...this.allowedDocumentTypes,
      ...this.allowedVideoTypes,
      ...this.allowedAudioTypes,
    ];

    if (!allAllowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'File type not supported. Please upload images, documents, videos, or audio files.',
      };
    }

    return { isValid: true };
  }

  async uploadFile(
    file: File,
    noteId?: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<FileMetadata> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Get upload URL from backend
      const uploadResponse = await apiService.getUploadUrl(file.name, file.type, file.size, noteId);
      
      // Encrypt file content if needed
      let fileToUpload = file;
      if (this.shouldEncryptFile(file.type)) {
        const encryptedContent = await this.encryptFile(file);
        fileToUpload = new File([encryptedContent], file.name, {
          type: file.type,
        });
      }

      // Upload to S3
      await this.uploadToS3(fileToUpload, uploadResponse.data.uploadUrl, onProgress);

      // Return file metadata
      return {
        id: uploadResponse.data.fileId,
        filename: uploadResponse.data.s3Key,
        originalName: file.name,
        contentType: file.type,
        size: file.size,
        url: uploadResponse.data.uploadUrl,
        uploadedBy: '', // Will be set by backend
        uploadedAt: new Date(),
        isEncrypted: this.shouldEncryptFile(file.type),
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Failed to upload file');
    }
  }

  private shouldEncryptFile(contentType: string): boolean {
    // Encrypt sensitive document types
    const sensitiveTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/rtf',
      'text/html',
      'application/json',
      'application/xml',
    ];
    return sensitiveTypes.includes(contentType);
  }

  private async encryptFile(file: File): Promise<Blob> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const content = new TextDecoder().decode(arrayBuffer);
      const encryptedContent = await encryptData(content, await this.getEncryptionKey());
      return new Blob([encryptedContent], { type: file.type });
    } catch (error) {
      console.error('Error encrypting file:', error);
      throw new Error('Failed to encrypt file');
    }
  }

  private async getEncryptionKey(): Promise<string> {
    // In a real app, you'd get this from secure storage
    return 'your-encryption-key';
  }

  private async uploadToS3(
    file: File,
    signedUrl: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress: UploadProgress = {
            loaded: event.loaded,
            total: event.total,
            percentage: (event.loaded / event.total) * 100,
          };
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('PUT', signedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      await apiService.deleteFile(fileId);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }

  async getFileMetadata(fileId: string): Promise<FileMetadata> {
    try {
      // This would be implemented in the API service
      throw new Error('Not implemented');
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw new Error('Failed to get file metadata');
    }
  }

  // Utility methods for file handling
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileIcon(contentType: string): string {
    if (contentType.startsWith('image/')) {
      return 'image';
    } else if (contentType === 'application/pdf') {
      return 'picture-as-pdf';
    } else if (contentType.includes('word')) {
      return 'description';
    } else if (contentType.includes('excel') || contentType.includes('spreadsheet')) {
      return 'table-chart';
    } else if (contentType === 'text/plain') {
      return 'article';
    } else {
      return 'attach-file';
    }
  }
}

export const fileUploadService = new FileUploadService(); 