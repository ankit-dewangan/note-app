import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { versionService, NoteVersion, VersionComparison } from '../../../src/services/versionService';
import { useSafeToast } from '../../../src/utils/toast';
import { decryptNoteContent } from '../../../src/utils/encryption';

export default function VersionHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<NoteVersion | null>(null);
  const [comparison, setComparison] = useState<VersionComparison | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [showVersionDetails, setShowVersionDetails] = useState(false);

  const { currentTheme } = useTheme();
  const { showError, showSuccess } = useSafeToast();

  // Function to decrypt version content
  const decryptVersionContent = async (versions: NoteVersion[]): Promise<NoteVersion[]> => {
    return Promise.all(
      versions.map(async (version) => {
        try {
          const decryptedContent = await decryptNoteContent(version.content);
          
          console.log('Decrypted version:', version.version, 'Title:', version.title.substring(0, 50), 'Content:', decryptedContent.substring(0, 50));
          
          return {
            ...version,
            content: decryptedContent,
          };
        } catch (error) {
          console.error('Error decrypting version content:', error);
          return version; // Return original if decryption fails
        }
      })
    );
  };

  useEffect(() => {
    if (id) {
      loadVersionHistory();
    }
  }, [id]);

  const loadVersionHistory = async () => {
    try {
      setIsLoading(true);
      const versionHistory = await versionService.getVersionHistory(id);
      
      // Decrypt the version content
      const decryptedVersions = await decryptVersionContent(versionHistory);
      setVersions(decryptedVersions);
    } catch (error) {
      console.error('Error loading version history:', error);
      showError('Failed to load version history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreVersion = async (version: NoteVersion) => {
    Alert.alert(
      'Restore Version',
      `Are you sure you want to restore this note to version ${versionService.formatVersionNumber(version.version)}? This will create a new version with the restored content.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            try {
              await versionService.restoreVersion(id, version.version);
              showSuccess('Version restored successfully');
              router.back();
            } catch (error) {
              console.error('Error restoring version:', error);
              showError('Failed to restore version');
            }
          },
        },
      ]
    );
  };

  const handleCompareVersions = async (version1: NoteVersion, version2: NoteVersion) => {
    try {
      const comparison = await versionService.compareVersions(id, version1.version, version2.version);
      
      // Ensure both versions are decrypted for comparison
      const decryptedV1Content = await decryptNoteContent(comparison.version1.content);
      const decryptedV2Content = await decryptNoteContent(comparison.version2.content);
      
      const decryptedComparison = {
        ...comparison,
        version1: {
          ...comparison.version1,
          content: decryptedV1Content,
        },
        version2: {
          ...comparison.version2,
          content: decryptedV2Content,
        },
      };
      
      setComparison(decryptedComparison);
      setShowComparison(true);
    } catch (error) {
      console.error('Error comparing versions:', error);
      showError('Failed to compare versions');
    }
  };

  const handleViewVersion = async (version: NoteVersion) => {
    try {
      // Ensure the version content is decrypted
      const decryptedContent = await decryptNoteContent(version.content);
      
      const decryptedVersion = {
        ...version,
        content: decryptedContent,
      };
      
      setSelectedVersion(decryptedVersion);
      setShowVersionDetails(true);
    } catch (error) {
      console.error('Error decrypting version content:', error);
      setSelectedVersion(version);
      setShowVersionDetails(true);
    }
  };

  const renderVersionItem = ({ item, index }: { item: NoteVersion; index: number }) => {
    const isLatest = index === 0;
    const isRecent = versionService.isRecentVersion(item);

    return (
      <View style={[styles.versionItem, { backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }]}>
        <View style={styles.versionHeader}>
          <View style={styles.versionInfo}>
            <Text style={[styles.versionNumber, { color: currentTheme.colors.text }]}>
              {versionService.formatVersionNumber(item.version)}
            </Text>
            {isLatest && (
              <View style={[styles.latestBadge, { backgroundColor: currentTheme.colors.primary }]}>
                <Text style={styles.latestText}>Latest</Text>
              </View>
            )}
            {isRecent && (
              <View style={[styles.recentBadge, { backgroundColor: currentTheme.colors.success }]}>
                <Text style={styles.recentText}>Recent</Text>
              </View>
            )}
          </View>
          <Text style={[styles.versionDate, { color: currentTheme.colors.textSecondary }]}>
            {new Date(item.createdAt).toLocaleString()}
          </Text>
        </View>

        <Text style={[styles.versionDescription, { color: currentTheme.colors.text }]}>
          {versionService.formatChangeDescription(item)}
        </Text>

        <View style={styles.versionActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: currentTheme.colors.primary }]}
            onPress={() => handleViewVersion(item)}
          >
            <MaterialIcons name="visibility" size={16} color="white" />
            <Text style={styles.actionButtonText}>View</Text>
          </TouchableOpacity>

          {index < versions.length - 1 && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: currentTheme.colors.secondary }]}
              onPress={() => handleCompareVersions(item, versions[index + 1])}
            >
              <MaterialIcons name="compare" size={16} color="white" />
              <Text style={styles.actionButtonText}>Compare</Text>
            </TouchableOpacity>
          )}

          {!isLatest && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: currentTheme.colors.warning }]}
              onPress={() => handleRestoreVersion(item)}
            >
              <MaterialIcons name="restore" size={16} color="white" />
              <Text style={styles.actionButtonText}>Restore</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={currentTheme.colors.primary} />
          <Text style={[styles.loadingText, { color: currentTheme.colors.textSecondary }]}>
            Loading version history...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: currentTheme.colors.surface, borderBottomColor: currentTheme.colors.border }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={currentTheme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: currentTheme.colors.text }]}>Version History</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadVersionHistory}>
            <MaterialIcons name="refresh" size={24} color={currentTheme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Version List */}
      <FlatList
        data={versions}
        renderItem={renderVersionItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.versionList}
        showsVerticalScrollIndicator={false}
      />

      {/* Version Details Modal */}
      <Modal
        visible={showVersionDetails}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: currentTheme.colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: currentTheme.colors.surface, borderBottomColor: currentTheme.colors.border }]}>
            <TouchableOpacity onPress={() => setShowVersionDetails(false)}>
              <MaterialIcons name="close" size={24} color={currentTheme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: currentTheme.colors.text }]}>
              {selectedVersion && `Version ${versionService.formatVersionNumber(selectedVersion.version)}`}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedVersion && (
            <View style={styles.modalContent}>
              <Text style={[styles.modalLabel, { color: currentTheme.colors.textSecondary }]}>Title</Text>
              <Text style={[styles.modalText, { color: currentTheme.colors.text }]}>{selectedVersion.title}</Text>

              <Text style={[styles.modalLabel, { color: currentTheme.colors.textSecondary }]}>Content</Text>
              <Text style={[styles.modalText, { color: currentTheme.colors.text }]}>{selectedVersion.content}</Text>

              <Text style={[styles.modalLabel, { color: currentTheme.colors.textSecondary }]}>Change Type</Text>
              <Text style={[styles.modalText, { color: currentTheme.colors.text }]}>{selectedVersion.changeType}</Text>

              <Text style={[styles.modalLabel, { color: currentTheme.colors.textSecondary }]}>Created</Text>
              <Text style={[styles.modalText, { color: currentTheme.colors.text }]}>
                {new Date(selectedVersion.createdAt).toLocaleString()}
              </Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Comparison Modal */}
      <Modal
        visible={showComparison}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: currentTheme.colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: currentTheme.colors.surface, borderBottomColor: currentTheme.colors.border }]}>
            <TouchableOpacity onPress={() => setShowComparison(false)}>
              <MaterialIcons name="close" size={24} color={currentTheme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: currentTheme.colors.text }]}>Version Comparison</Text>
            <View style={{ width: 24 }} />
          </View>

          {comparison && (
            <View style={styles.modalContent}>
              {/* Side-by-side comparison */}
              <View style={styles.comparisonContainer}>
                <View style={styles.comparisonVersionColumn}>
                  <View style={[styles.comparisonVersionHeader, { backgroundColor: currentTheme.colors.background }]}>
                    <Text style={[styles.comparisonVersionLabel, { color: currentTheme.colors.primary }]}>
                      Version {comparison.version1.version} (CURRENT)
                    </Text>
                    <Text style={[styles.comparisonVersionDate, { color: currentTheme.colors.textSecondary }]}>
                      {new Date(comparison.version1.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  <View style={[styles.comparisonVersionContentContainer, { backgroundColor: currentTheme.colors.background }]}>
                    <Text style={[styles.modalLabel, { color: currentTheme.colors.textSecondary }]}>Title</Text>
                    <Text style={[styles.modalText, { color: currentTheme.colors.text }]}>
                      {comparison.version1.title}
                    </Text>
                    
                    <Text style={[styles.modalLabel, { color: currentTheme.colors.textSecondary }]}>Content</Text>
                    <Text style={[styles.modalText, { color: currentTheme.colors.text }]}>
                      {comparison.version1.content}
                    </Text>
                  </View>
                </View>
                
                <View style={[styles.comparisonVersionDivider, { backgroundColor: currentTheme.colors.border }]} />
                
                <View style={styles.comparisonVersionColumn}>
                  <View style={[styles.comparisonVersionHeader, { backgroundColor: currentTheme.colors.background }]}>
                    <Text style={[styles.comparisonVersionLabel, { color: currentTheme.colors.primary }]}>
                      Version {comparison.version2.version} (PREVIOUS)
                    </Text>
                    <Text style={[styles.comparisonVersionDate, { color: currentTheme.colors.textSecondary }]}>
                      {new Date(comparison.version2.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  <View style={[styles.comparisonVersionContentContainer, { backgroundColor: currentTheme.colors.background }]}>
                    <Text style={[styles.modalLabel, { color: currentTheme.colors.textSecondary }]}>Title</Text>
                    <Text style={[styles.modalText, { color: currentTheme.colors.text }]}>
                      {comparison.version2.title}
                    </Text>
                    
                    <Text style={[styles.modalLabel, { color: currentTheme.colors.textSecondary }]}>Content</Text>
                    <Text style={[styles.modalText, { color: currentTheme.colors.text }]}>
                      {comparison.version2.content}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Summary of changes */}
              <View style={[styles.comparisonSummaryContainer, { backgroundColor: currentTheme.colors.background }]}>
                <Text style={[styles.modalLabel, { color: currentTheme.colors.textSecondary }]}>Summary of Changes</Text>
                <View style={styles.differencesList}>
                  {comparison.differences.title && (
                    <Text style={[styles.differenceItem, { color: currentTheme.colors.warning }]}>• Title changed</Text>
                  )}
                  {comparison.differences.content && (
                    <Text style={[styles.differenceItem, { color: currentTheme.colors.warning }]}>• Content changed</Text>
                  )}
                  {comparison.differences.tags && (
                    <Text style={[styles.differenceItem, { color: currentTheme.colors.warning }]}>• Tags changed</Text>
                  )}
                  {comparison.differences.color && (
                    <Text style={[styles.differenceItem, { color: currentTheme.colors.warning }]}>• Color changed</Text>
                  )}
                </View>

                <Text style={[styles.modalLabel, { color: currentTheme.colors.textSecondary }]}>Content Statistics</Text>
                <Text style={[styles.modalText, { color: currentTheme.colors.text }]}>
                  Previous: {comparison.contentDiff.length1} characters
                </Text>
                <Text style={[styles.modalText, { color: currentTheme.colors.text }]}>
                  Current: {comparison.contentDiff.length2} characters
                </Text>
                <Text style={[styles.modalText, { color: currentTheme.colors.success }]}>
                  Added: {comparison.contentDiff.added} characters
                </Text>
                <Text style={[styles.modalText, { color: currentTheme.colors.error }]}>
                  Removed: {comparison.contentDiff.removed} characters
                </Text>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 8,
  },
  versionList: {
    padding: 16,
  },
  versionItem: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  versionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  versionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  versionNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  latestBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  latestText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  recentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recentText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  versionDate: {
    fontSize: 12,
  },
  versionDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  versionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 8,
  },
  differencesList: {
    marginBottom: 16,
  },
  differenceItem: {
    fontSize: 14,
    marginBottom: 4,
  },
  // Comparison styles
  comparisonContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  comparisonVersionColumn: {
    flex: 1,
    marginHorizontal: 4,
  },
  comparisonVersionHeader: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  comparisonVersionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  comparisonVersionDate: {
    fontSize: 12,
  },
  comparisonVersionContentContainer: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  comparisonVersionDivider: {
    width: 2,
    marginHorizontal: 8,
  },
  comparisonSummaryContainer: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
  },
}); 