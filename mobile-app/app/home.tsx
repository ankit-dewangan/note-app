import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthContext } from '../src/contexts/AuthContext';
import { useNotesStore, Note } from '../src/store/notesStore';
import { useSafeToast } from '../src/utils/toast';
import * as SecureStore from 'expo-secure-store';

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const { user, signOut } = useAuthContext();
  const { 
    notes, 
    searchResults, 
    isSearching,
    fetchNotes, 
    searchNotes, 
    clearSearch 
  } = useNotesStore();
  const { showError, showSuccess } = useSafeToast();

  useEffect(() => {
    loadNotes();
  }, []);

  // Debug effect to monitor notes state
  useEffect(() => {
    console.log('Home screen: Notes state changed:', {
      notesCount: notes.length,
      isLoading: false,
      searchResultsCount: searchResults.length,
      isSearching
    });
  }, [notes, searchResults, isSearching]);

  const loadNotes = async () => {
    try {
      console.log('Home screen: Starting loadNotes...');
      await fetchNotes();
      console.log('Home screen: loadNotes completed');
    } catch (error) {
      console.error('Home screen: Error in loadNotes:', error);
      showError('Failed to load notes', 'Error');
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      try {
        await searchNotes(query);
      } catch (error) {
        showError('Search failed', 'Error');
      }
    } else {
      clearSearch();
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      showError('Sign out failed', 'Error');
    }
  };

  const createSampleNotes = async () => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/notes/sample`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await SecureStore.getItemAsync('auth_token')}`,
        },
      });
      
      if (response.ok) {
        await loadNotes(); // Refresh the notes list
        showSuccess('Sample notes created!', 'Success');
      } else {
        showError('Failed to create sample notes', 'Error');
      }
    } catch (error) {
      showError('Failed to create sample notes', 'Error');
    }
  };

  const testEncryption = async () => {
    try {
      const { encryptNoteContent, decryptNoteContent } = await import('../src/utils/encryption');
      
      const testContent = 'This is a test note content for encryption testing.';
      console.log('Original content:', testContent);
      
      const encrypted = await encryptNoteContent(testContent);
      console.log('Encrypted content:', encrypted);
      
      const decrypted = await decryptNoteContent(encrypted);
      console.log('Decrypted content:', decrypted);
      
      if (testContent === decrypted) {
        showSuccess('Encryption test passed!', 'Success');
      } else {
        showError('Encryption test failed!', 'Error');
      }
    } catch (error) {
      console.error('Encryption test error:', error);
      showError('Encryption test failed!', 'Error');
    }
  };

  const renderNoteItem = ({ item }: { item: Note }) => (
    <TouchableOpacity 
      style={styles.noteItem}
      onPress={() => router.push(`/note/${item.id}` as any)}
    >
      <View style={styles.noteContent}>
        <View style={styles.noteHeader}>
          <View style={styles.noteInfo}>
            <Text style={styles.noteTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.notePreview} numberOfLines={2}>
              {item.content}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.moreButton}
            onPress={() => router.push(`/note/${item.id}` as any)}
          >
            <MaterialIcons name="more-vert" size={20} color="#757575" />
          </TouchableOpacity>
        </View>
        <View style={styles.noteFooter}>
          <View style={styles.noteMeta}>
            <Text style={styles.noteDate}>
              {new Date(item.updatedAt).toLocaleDateString()}
            </Text>
            {item.collaborators && item.collaborators.length > 0 && (
              <View style={styles.collaborationInfo}>
                <MaterialIcons name="people" size={16} color="#2196F3" />
                <Text style={styles.collaborationText}>
                  {item.collaborators.length + 1} collaborators
                </Text>
              </View>
            )}
          </View>
          <View style={styles.noteActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push(`/note/${item.id}` as any)}
            >
              <MaterialIcons name="edit" size={16} color="#2196F3" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="note-add" size={64} color="#757575" />
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'No notes found' : 'No notes yet'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? 'Try adjusting your search terms' 
          : 'Create your first encrypted note to get started'
        }
      </Text>
      {!searchQuery && (
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => router.push('/note/new' as any)}
        >
          <MaterialIcons name="add" size={20} color="white" />
          <Text style={styles.createButtonText}>Create Note</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const displayNotes = searchQuery.trim() ? searchResults : notes;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Global Notes</Text>
            <Text style={styles.headerSubtitle}>
              Collaborative notes shared across all users
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.testButton}
              onPress={testEncryption}
            >
              <MaterialIcons name="security" size={24} color="#FF9800" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.sampleButton}
              onPress={createSampleNotes}
            >
              <MaterialIcons name="add-circle" size={24} color="#4CAF50" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={() => setSearchQuery('')}
            >
              <MaterialIcons name="search" size={24} color="#2196F3" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => router.push('/note/new' as any)}
            >
              <MaterialIcons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color="#757575" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notes..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#9CA3AF"
          />
          {isSearching && (
            <ActivityIndicator size="small" color="#2196F3" style={styles.searchSpinner} />
          )}
        </View>
      </View>

      {/* Notes List */}
      <View style={styles.notesContainer}>
        {displayNotes.length > 0 ? (
          <FlatList
            data={displayNotes}
            renderItem={renderNoteItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.notesList}
            refreshing={false}
            onRefresh={loadNotes}
          />
        ) : (
          renderEmptyState()
        )}
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={ () => { router.push('/note/new' as any)}}
      >
        <MaterialIcons name="add" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  testButton: {
    padding: 8,
    marginRight: 8,
  },
  sampleButton: {
    padding: 8,
    marginRight: 8,
  },
  searchButton: {
    padding: 8,
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 20,
  },
  logoutButton: {
    padding: 8,
  },
  searchContainer: {
    padding: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#000000',
  },
  searchSpinner: {
    marginLeft: 8,
  },
  notesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  notesList: {
    paddingBottom: 100,
  },
  noteItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  noteContent: {
    flex: 1,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  noteInfo: {
    flex: 1,
    marginRight: 8,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  notePreview: {
    fontSize: 14,
    color: '#757575',
    lineHeight: 20,
  },
  moreButton: {
    padding: 4,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noteDate: {
    fontSize: 12,
    color: '#757575',
  },
  collaborationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  collaborationText: {
    fontSize: 12,
    color: '#2196F3',
    marginLeft: 4,
  },
  noteActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#757575',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
}); 