import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthContext } from '../../src/contexts/AuthContext';
import { useNotesStore, Note } from '../../src/store/notesStore';
import { useSafeToast } from '../../src/utils/toast';
import { collaborationService } from '../../src/services/collaborationService';
import { fileUploadService, FileMetadata } from '../../src/services/fileUploadService';
import { apiService } from '../../src/services/apiService';

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [previousContent, setPreviousContent] = useState(''); // Track previous content for collaboration
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [attachedFiles, setAttachedFiles] = useState<FileMetadata[]>([]);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [viewingImage, setViewingImage] = useState<{ url: string; name: string } | null>(null);
  const [activeUsers, setActiveUsers] = useState<Array<{
    userId: string;
    username: string;
    color: string;
    position?: { x: number; y: number };
    selection?: { start: number; end: number };
  }>>([]);
  
  const { user, getAuthToken } = useAuthContext();
  const { currentNote, fetchNote, createNote, updateNote, deleteNote, updateNoteContent } = useNotesStore();
  const { showError, showSuccess } = useSafeToast();
  
  const contentInputRef = useRef<TextInput>(null);
  const isNewNote = id === 'new';

  useEffect(() => {
    if (!isNewNote && id) {
      loadNote();
      loadFiles();
    }
  }, [id]);

  useEffect(() => {
    if (currentNote && !isNewNote) {
      setTitle(currentNote.title);
      setContent(currentNote.content);
      setPreviousContent(currentNote.content); // Set previous content for collaboration
      setCollaborators(currentNote.collaborators || []);
    }
  }, [currentNote]);

  useEffect(() => {
    if (!isNewNote && user) {
      setupCollaboration();
    }

    return () => {
      // if (!isNewNote) {
      //   collaborationService.leaveNote();
      // }
    };
  }, [isNewNote, user]);

  // Periodic cursor position updates
  useEffect(() => {
    if (isCollaborating && collaborationService && collaborationService.sendCursorPosition) {
      const interval = setInterval(() => {
        try {
          // Send a heartbeat cursor position
          const cursorPosition = { x: 0, y: 0 };
          collaborationService.sendCursorPosition(cursorPosition);
        } catch (error) {
          console.error('Error sending periodic cursor position:', error);
        }
      }, 5000); // Update every 5 seconds

      return () => clearInterval(interval);
    }
  }, [isCollaborating]);

  const loadNote = async () => {
    try {
      setIsLoading(true);
      await fetchNote(id);
    } catch (error) {
      showError('Failed to load note', 'Error');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const loadFiles = async () => {
    try {
      if (!isNewNote && id) {
        const files = await apiService.getFilesByNoteId(id);
        setAttachedFiles(files);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  const setupCollaboration = async () => {
    try {
      console.log('Setting up collaboration for note:', user?.id, id);
      if (user && id) {
        await collaborationService.joinNote(
          id,
          user.id,
          `${user.firstName} ${user.lastName}`
        );
        setIsCollaborating(true);

        // Set up event listeners
        collaborationService.setContentChangeListener((operation: any) => {
          try {
            // Handle full content updates
            if (operation.type === 'full-update') {
              console.log('Received full content update from user:', operation.userId);
              if (operation.content !== content) {
                setContent(operation.content);
                setPreviousContent(operation.content);
                
                // Update the note in the store for real-time sync
                if (id && !isNewNote) {
                  updateNoteContent(id, operation.content);
                }
              }
            } else {
              // Handle legacy operation-based updates
              if (operation && typeof operation === 'object') {
                const newContent = collaborationService.applyOperation(content, operation);
                if (newContent !== content) {
                  setContent(newContent);
                  setPreviousContent(newContent);
                  
                  // Update the note in the store for real-time sync
                  if (id && !isNewNote) {
                    updateNoteContent(id, newContent);
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error applying content change:', error);
          }
        });

        // Set up cursor change listener
        collaborationService.setCursorChangeListener((cursorData: any) => {
          try {
            console.log('Received cursor update:', cursorData);
            setActiveUsers(prev => {
              const existingUserIndex = prev.findIndex(u => u.userId === cursorData.userId);
              if (existingUserIndex >= 0) {
                // Update existing user
                const updated = [...prev];
                updated[existingUserIndex] = {
                  ...updated[existingUserIndex],
                  position: cursorData.position,
                  selection: cursorData.selection,
                };
                return updated;
              } else {
                // Add new user
                return [...prev, {
                  userId: cursorData.userId,
                  username: cursorData.username,
                  color: cursorData.color,
                  position: cursorData.position,
                  selection: cursorData.selection,
                }];
              }
            });
          } catch (error) {
            console.error('Error handling cursor change:', error);
          }
        });

        collaborationService.setErrorListener((error) => {
          console.error('Collaboration error:', error);
          // Don't show error to user for collaboration issues
        });
      }
    } catch (error) {
      console.error('Failed to setup collaboration:', error);
      // Silently disable collaboration without showing error to user
      setIsCollaborating(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showError('Please enter a title', 'Error');
      return;
    }

    try {
      setIsSaving(true);
      
      if (isNewNote) {
        await createNote({
          title: title.trim(),
          content: content.trim(),
        });
        showSuccess('Note created successfully', 'Success');
      } else {
        await updateNote(id, {
          title: title.trim(),
          content: content.trim(),
        });
        showSuccess('Note updated successfully', 'Success');
      }
      
      router.back();
    } catch (error) {
      showError('Failed to save note', 'Error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isNewNote) {
      router.back();
      return;
    }

    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSaving(true);
              await deleteNote(id);
              showSuccess('Note deleted successfully', 'Success');
              router.back();
            } catch (error) {
              showError('Failed to delete note', 'Error');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleContentChange = (text: string) => {
    setContent(text);
    
    // Send real-time updates if collaborating
    if (isCollaborating && 
        collaborationService && 
        collaborationService.isConnected && 
        collaborationService.isConnected() &&
        collaborationService.sendContentChange) {
      try {
        // Send full content instead of operations
        if (text !== previousContent) {
          console.log('Sending full content update, length:', text.length);
          collaborationService.sendContentChange(text);
          setPreviousContent(text);
        }
      } catch (error) {
        console.error('Error sending content change:', error);
        // Don't show error to user for collaboration failures
      }
    }
  };

  const handleSelectionChange = (event: any) => {
    if (isCollaborating && collaborationService && collaborationService.sendCursorPosition) {
      try {
        const { selection } = event.nativeEvent;
        if (selection) {
          // Calculate cursor position (simplified)
          const cursorPosition = { x: 0, y: 0 }; // In a real app, calculate actual position
          collaborationService.sendCursorPosition(cursorPosition, selection);
        }
      } catch (error) {
        console.error('Error sending cursor position:', error);
      }
    }
  };

  const handleFileUpload = async () => {
    Alert.alert(
      'Upload File',
      'Choose file type',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Image',
          onPress: () => uploadFile('image'),
        },
        {
          text: 'Document',
          onPress: () => uploadFile('document'),
        },
        {
          text: 'Video',
          onPress: () => uploadFile('video'),
        },
        {
          text: 'Audio',
          onPress: () => uploadFile('audio'),
        },
        {
          text: 'Take Photo',
          onPress: () => uploadFile('camera'),
        },
        {
          text: 'Any File',
          onPress: () => uploadFile('any'),
        },
      ]
    );
  };

  const uploadFile = async (type: 'image' | 'document' | 'video' | 'audio' | 'camera' | 'any') => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      let file: File | null = null;

      switch (type) {
        case 'image':
          file = await fileUploadService.pickImage();
          break;
        case 'document':
          file = await fileUploadService.pickDocument();
          break;
        case 'video':
          file = await fileUploadService.pickVideo();
          break;
        case 'audio':
          file = await fileUploadService.pickAudio();
          break;
        case 'camera':
          file = await fileUploadService.takePhoto();
          break;
        case 'any':
          file = await fileUploadService.pickAnyFile();
          break;
      }

      if (!file) {
        return;
      }

      const fileMetadata = await fileUploadService.uploadFile(
        file, 
        isNewNote ? undefined : id, // Pass noteId if not a new note
        (progress) => {
          setUploadProgress(progress.percentage);
        }
      );

      setAttachedFiles(prev => [...prev, fileMetadata]);
      showSuccess('File uploaded successfully', 'Success');
      
      // Refresh files list to get the latest data
      if (!isNewNote) {
        await loadFiles();
      }
    } catch (error) {
      showError('Failed to upload file', 'Error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const removeFile = async (fileId: string) => {
    try {
      await fileUploadService.deleteFile(fileId);
      setAttachedFiles(prev => prev.filter(file => file.id !== fileId));
      showSuccess('File removed successfully', 'Success');
      
      // Refresh files list to get the latest data
      if (!isNewNote) {
        await loadFiles();
      }
    } catch (error) {
      showError('Failed to remove file', 'Error');
    }
  };

  const viewFile = async (file: FileMetadata) => {
    try {
      // Get fresh download URL
      const fileData = await apiService.getFileMetadata(file?._id || file.id);
      
      // Handle different file types
      if (file.contentType && file.contentType.startsWith('image/')) {
        // Display images inline
        setViewingImage({
          url: fileData.downloadUrl,
          name: file.originalName
        });
      } else if (file.contentType && file.contentType.includes('pdf')) {
        // For PDFs, show download option
        Alert.alert(
          'PDF Document',
          `Would you like to download "${file.originalName}"?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Download', onPress: () => {
              // You can implement PDF viewer or download here
              Alert.alert('Download', `Downloading PDF: ${file.originalName}`);
            }}
          ]
        );
      } else if (file.contentType && file.contentType.includes('video')) {
        // For videos, show download option
        Alert.alert(
          'Video File',
          `Would you like to download "${file.originalName}"?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Download', onPress: () => {
              Alert.alert('Download', `Downloading video: ${file.originalName}`);
            }}
          ]
        );
      } else if (file.contentType && file.contentType.includes('audio')) {
        // For audio files, show download option
        Alert.alert(
          'Audio File',
          `Would you like to download "${file.originalName}"?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Download', onPress: () => {
              Alert.alert('Download', `Downloading audio: ${file.originalName}`);
            }}
          ]
        );
      } else {
        // For other files, show download option
        Alert.alert(
          'Document',
          `Would you like to download "${file.originalName}"?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Download', onPress: () => {
              Alert.alert('Download', `Downloading file: ${file.originalName}`);
            }}
          ]
        );
      }
    } catch (error) {
      showError('Failed to view file', 'Error');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading note...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              {isNewNote ? 'New Note' : 'Global Note'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isNewNote ? 'Create a new collaborative note' : 'Edit shared note with real-time collaboration'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.headerButton, isSaving && styles.disabledButton]} 
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#2196F3" size="small" />
              ) : (
                <MaterialIcons name="save" size={20} color="#2196F3" />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
              <MaterialIcons name="close" size={20} color="#757575" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Collaboration Status */}
      {isCollaborating && (
        <View style={styles.collaborationContainer}>
          <MaterialIcons name="people" size={20} color="#2196F3" />
          <Text style={styles.collaborationText}>
            Real-time collaboration active • {collaborators.length + 1} users can edit
          </Text>
        </View>
      )}

      {/* Active Users */}
      {activeUsers.length > 0 && (
        <View style={styles.activeUsersContainer}>
          <Text style={styles.activeUsersTitle}>Currently Editing:</Text>
          <View style={styles.activeUsersList}>
            {activeUsers.map((user, index) => (
              <View key={user.userId} style={styles.activeUserItem}>
                <View 
                  style={[
                    styles.userColorIndicator, 
                    { backgroundColor: user.color }
                  ]} 
                />
                <Text style={styles.activeUserName}>
                  {user.username}
                  {user.selection && (
                    <Text style={styles.cursorPosition}>
                      {' '}(position: {user.selection.start})
                    </Text>
                  )}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Note Content */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="Enter note title"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Content</Text>
          <TextInput
            ref={contentInputRef}
            style={styles.contentInput}
            placeholder="Start writing your note..."
            value={content}
            onChangeText={handleContentChange}
            onSelectionChange={handleSelectionChange}
            multiline
            textAlignVertical="top"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* File Attachments */}
        {attachedFiles.length > 0 && (
          <View key={attachedFiles.length} style={styles.filesContainer}>
            <Text style={styles.label}>Attached Files</Text>
            {attachedFiles.map((file) => {
              // Determine file type and icon
              const getFileIcon = () => {
                if (!file.contentType) return 'insert-drive-file';
                
                if (file.contentType.startsWith('image/')) {
                  return 'image';
                } else if (file.contentType.includes('pdf')) {
                  return 'picture-as-pdf';
                } else if (file.contentType.includes('word') || file.contentType.includes('document')) {
                  return 'description';
                } else if (file.contentType.includes('excel') || file.contentType.includes('spreadsheet')) {
                  return 'table-chart';
                } else if (file.contentType.includes('text')) {
                  return 'text-fields';
                } else if (file.contentType.includes('video')) {
                  return 'video-file';
                } else if (file.contentType.includes('audio')) {
                  return 'audiotrack';
                } else {
                  return 'insert-drive-file';
                }
              };

              const getFileTypeText = () => {
                if (!file.contentType) return 'Unknown File';
                
                if (file.contentType.startsWith('image/')) {
                  return 'Image';
                } else if (file.contentType.includes('pdf')) {
                  return 'PDF Document';
                } else if (file.contentType.includes('word') || file.contentType.includes('document')) {
                  return 'Word Document';
                } else if (file.contentType.includes('excel') || file.contentType.includes('spreadsheet')) {
                  return 'Excel Spreadsheet';
                } else if (file.contentType.includes('text')) {
                  return 'Text File';
                } else if (file.contentType.includes('video')) {
                  return 'Video File';
                } else if (file.contentType.includes('audio')) {
                  return 'Audio File';
                } else {
                  return 'Document';
                }
              };

              return (
                <View key={file.id} style={styles.fileItem}>
                  <MaterialIcons 
                    name={getFileIcon() as any} 
                    size={24} 
                    color="#2196F3" 
                  />
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName}>{file.originalName}</Text>
                    <View style={styles.fileTypeContainer}>
                      <Text style={styles.fileTypeBadge}>{getFileTypeText()}</Text>
                      <Text style={styles.fileSize}>
                        {fileUploadService.formatFileSize(file.size)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.viewFileButton}
                    onPress={() => {
                      console.log(file)
                     viewFile(file)
                    }}
                  >
                    <MaterialIcons name="visibility" size={20} color="#2196F3" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.removeFileButton}
                    onPress={() => removeFile(file.id)}
                  >
                    <MaterialIcons name="close" size={20} color="#F44336" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <View style={styles.uploadProgressContainer}>
            <Text style={styles.uploadProgressText}>
              Uploading... {uploadProgress.toFixed(1)}%
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Image Viewer Modal */}
      {viewingImage && (
        <View style={styles.imageViewerOverlay}>
          <View style={styles.imageViewerContainer}>
            <View style={styles.imageViewerHeader}>
              <Text style={styles.imageViewerTitle}>{viewingImage.name}</Text>
              <TouchableOpacity 
                style={styles.closeImageViewerButton}
                onPress={() => setViewingImage(null)}
              >
                <MaterialIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Image 
              source={{ uri: viewingImage.url }} 
              style={styles.imageViewerImage}
              resizeMode="contain"
            />
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.uploadButton} onPress={handleFileUpload}>
            <MaterialIcons name="attach-file" size={20} color="#2196F3" />
            <Text style={styles.uploadButtonText}>Attach</Text>
          </TouchableOpacity>
          
          {!isNewNote && (
            <TouchableOpacity 
              style={[styles.deleteButton, isSaving && styles.disabledButton]} 
              onPress={handleDelete}
              disabled={isSaving}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.saveButton, isSaving && styles.disabledButton]} 
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>
                {isNewNote ? 'Create' : 'Save'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 16,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  collaborationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  collaborationText: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 8,
  },
  activeUsersContainer: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  activeUsersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  activeUsersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  activeUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  userColorIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  activeUserName: {
    fontSize: 12,
    color: '#000000',
  },
  cursorPosition: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    minHeight: 48,
  },
  contentInput: {
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    textAlignVertical: 'top',
    minHeight: 200,
  },
  filesContainer: {
    marginBottom: 20,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  fileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  fileTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  fileTypeBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  fileType: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  fileSize: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  viewFileButton: {
    padding: 4,
    marginLeft: 8,
  },
  removeFileButton: {
    padding: 4,
  },
  uploadProgressContainer: {
    marginBottom: 20,
  },
  uploadProgressText: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#757575',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2196F3',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  uploadButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  deleteButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#F44336',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  imageViewerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  imageViewerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    width: '90%',
    height: '90%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  imageViewerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
  closeImageViewerButton: {
    padding: 8,
  },
  imageViewerImage: {
    width: '100%',
    height: '100%',
  },
}); 