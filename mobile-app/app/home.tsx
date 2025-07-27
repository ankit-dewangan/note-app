import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthContext } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { useNotesStore } from '../src/store/notesStore';
import { apiService } from '../src/services/apiService';

export default function HomeScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshRotation] = useState(new Animated.Value(0));
  const { signOut } = useAuthContext();
  const { currentTheme, toggleTheme, themeType } = useTheme();
  const { notes, fetchNotes, createSampleNotes } = useNotesStore();

  useEffect(() => {
    loadNotes();
  }, []);

  // Animate refresh icon rotation
  useEffect(() => {
    if (refreshing) {
      Animated.loop(
        Animated.timing(refreshRotation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      refreshRotation.setValue(0);
    }
  }, [refreshing]);

  const spin = refreshRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      await fetchNotes();
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading notes:', error);
      Alert.alert('Error', 'Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchNotes();
      setLastUpdated(new Date());
      // Show a brief success message
      console.log('Notes refreshed successfully');
    } catch (error) {
      console.error('Error refreshing notes:', error);
      Alert.alert('Error', 'Failed to refresh notes');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateSampleNotes = async () => {
    try {
      setIsLoading(true);
      await createSampleNotes();
      Alert.alert('Success', 'Sample notes created successfully!');
    } catch (error) {
      console.error('Error creating sample notes:', error);
      Alert.alert('Error', 'Failed to create sample notes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const handleNotePress = (noteId: string) => {
    router.push(`/note/${noteId}` as any);
  };

  const handleSearchPress = () => {
    router.push('/search' as any);
  };

  const handleAddNote = () => {
    router.push('/note/new' as any);
  };

  const handleThemePress = () => {
    router.push('/settings/theme' as any);
  };

  const handleSettingsPress = () => {
    router.push('/settings' as any);
  };

  const renderNote = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.noteCard, { backgroundColor: currentTheme.colors.card }]}
      onPress={() => handleNotePress(item.id)}
    >
      <View style={styles.noteHeader}>
        <Text style={[styles.noteTitle, { color: currentTheme.colors.text }]} numberOfLines={2}>
          {item.title || 'Untitled Note'}
        </Text>
        <Text style={[styles.noteDate, { color: currentTheme.colors.textSecondary }]}>
          {new Date(item.updatedAt).toLocaleDateString()}
        </Text>
      </View>
      
      <Text style={[styles.noteContent, { color: currentTheme.colors.textSecondary }]} numberOfLines={3}>
        {item.content || 'No content'}
      </Text>
      
      <View style={styles.noteMeta}>
        <View style={styles.collaborationInfo}>
          <MaterialIcons name="group" size={16} color={currentTheme.colors.primary} />
          <Text style={[styles.collaborationText, { color: currentTheme.colors.textSecondary }]}>
            Global Note • Real-time collaboration
          </Text>
        </View>
      </View>
      
      <View style={styles.noteActions}>
        <TouchableOpacity style={styles.actionButton}>
          <MaterialIcons name="edit" size={16} color={currentTheme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <MaterialIcons name="delete" size={16} color={currentTheme.colors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: currentTheme.colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: currentTheme.colors.text }]}>
            Global Notes
          </Text>
          <Text style={[styles.headerSubtitle, { color: currentTheme.colors.textSecondary }]}>
            Collaborative notes shared across all users
         
          </Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={onRefresh} disabled={refreshing}>
            {refreshing ? (
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <ActivityIndicator size="small" color={currentTheme.colors.primary} />
              </Animated.View>
            ) : (
              <MaterialIcons name="refresh" size={24} color={currentTheme.colors.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleSearchPress}>
            <MaterialIcons name="search" size={24} color={currentTheme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleThemePress}>
            <MaterialIcons 
              name={themeType === 'dark' ? 'light-mode' : 'dark-mode'} 
              size={24} 
              color={currentTheme.colors.primary} 
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleSettingsPress}>
            <MaterialIcons name="settings" size={24} color={currentTheme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleSignOut}>
            <MaterialIcons name="logout" size={24} color={currentTheme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={currentTheme.colors.primary} />
            <Text style={[styles.loadingText, { color: currentTheme.colors.textSecondary }]}>
              Loading notes...
            </Text>
          </View>
        ) : notes.length > 0 ? (
          <FlatList
            data={notes}
            renderItem={renderNote}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.notesList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[currentTheme.colors.primary]}
                tintColor={currentTheme.colors.primary}
              />
            }
          />
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="note-add" size={64} color={currentTheme.colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: currentTheme.colors.text }]}>
              No notes yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: currentTheme.colors.textSecondary }]}>
              Create your first note or add sample notes to get started
            </Text>
            
            <View style={styles.emptyActions}>
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: currentTheme.colors.primary }]}
                onPress={handleAddNote}
              >
                <MaterialIcons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>Create Note</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.emptyButton, styles.sampleButton, { backgroundColor: currentTheme.colors.secondary }]}
                onPress={handleCreateSampleNotes}
              >
                <MaterialIcons name="auto-awesome" size={20} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>Add Sample Notes</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Floating Action Button */}
      {notes.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: currentTheme.colors.primary }]}
          onPress={handleAddNote}
        >
          <MaterialIcons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  notesList: {
    padding: 16,
  },
  noteCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  noteTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  noteDate: {
    fontSize: 12,
  },
  noteContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  noteMeta: {
    marginBottom: 12,
  },
  collaborationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  collaborationText: {
    fontSize: 12,
  },
  noteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
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
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sampleButton: {
    backgroundColor: '#FF9800',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  lastUpdated: {
    fontSize: 12,
  },
}); 