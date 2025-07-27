import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { apiService } from '../src/services/apiService';
import { useSafeToast } from '../src/utils/toast';

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

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchType, setSearchType] = useState<'all' | 'title' | 'content' | 'tags'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const { showError } = useSafeToast();

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string, type: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      try {
        setIsLoading(true);
        const response = await apiService.searchNotes(
          searchQuery,
          1,
          50,
          type as 'all' | 'title' | 'content' | 'tags'
        );
        setResults(response.data);
      } catch (error) {
        console.error('Search error:', error);
        showError('Failed to search notes', 'Error');
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  // Trigger search when query or search type changes
  useEffect(() => {
    debouncedSearch(query, searchType);
  }, [query, searchType, debouncedSearch]);

  const handleResultPress = (result: SearchResult) => {
    router.push(`/note/${result.id}` as any);
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity style={styles.resultItem} onPress={() => handleResultPress(item)}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.resultMeta}>
          <Text style={styles.resultScore}>Score: {item.score}</Text>
          <Text style={styles.resultDate}>
            {new Date(item.updatedAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {item.highlights.content.length > 0 && (
        <View style={styles.highlightContainer}>
          <Text style={styles.highlightLabel}>Content matches:</Text>
          {item.highlights.content.map((highlight, index) => (
            <Text key={index} style={styles.highlightText} numberOfLines={2}>
              {highlight}
            </Text>
          ))}
        </View>
      )}

      {item.highlights.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          <Text style={styles.highlightLabel}>Tag matches:</Text>
          <View style={styles.tagsList}>
            {item.highlights.tags.map((tag, index) => (
              <View key={index} style={styles.tagItem}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.matchTypes}>
        {item.matchType.title && (
          <View style={styles.matchType}>
            <MaterialIcons name="title" size={16} color="#4CAF50" />
            <Text style={styles.matchTypeText}>Title</Text>
          </View>
        )}
        {item.matchType.content && (
          <View style={styles.matchType}>
            <MaterialIcons name="description" size={16} color="#2196F3" />
            <Text style={styles.matchTypeText}>Content</Text>
          </View>
        )}
        {item.matchType.tags && (
          <View style={styles.matchType}>
            <MaterialIcons name="local-offer" size={16} color="#FF9800" />
            <Text style={styles.matchTypeText}>Tags</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Notes</Text>
        <TouchableOpacity 
          style={styles.filterButton} 
          onPress={() => setShowFilters(!showFilters)}
        >
          <MaterialIcons name="filter-list" size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color="#757575" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notes, titles, content, or tags..."
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <MaterialIcons name="clear" size={20} color="#757575" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filtersTitle}>Search in:</Text>
          <View style={styles.filterOptions}>
            {[
              { key: 'all', label: 'All', icon: 'search' },
              { key: 'title', label: 'Title', icon: 'title' },
              { key: 'content', label: 'Content', icon: 'description' },
              { key: 'tags', label: 'Tags', icon: 'local-offer' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterOption,
                  searchType === option.key && styles.filterOptionActive
                ]}
                onPress={() => setSearchType(option.key as any)}
              >
                <MaterialIcons 
                  name={option.icon as any} 
                  size={16} 
                  color={searchType === option.key ? '#FFFFFF' : '#757575'} 
                />
                <Text style={[
                  styles.filterOptionText,
                  searchType === option.key && styles.filterOptionTextActive
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Results */}
      <View style={styles.resultsContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : results.length > 0 ? (
          <FlatList
            data={results}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.resultsList}
          />
        ) : query.length > 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="search-off" size={64} color="#757575" />
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your search terms or filters
            </Text>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="search" size={64} color="#757575" />
            <Text style={styles.emptyTitle}>Start searching</Text>
            <Text style={styles.emptySubtitle}>
              Search through your notes by title, content, or tags
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    padding: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#000000',
  },
  filtersContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    marginBottom: 8,
  },
  filterOptionActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 4,
  },
  filterOptionTextActive: {
    color: '#FFFFFF',
  },
  resultsContainer: {
    flex: 1,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
  resultsList: {
    padding: 16,
  },
  resultItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  resultHeader: {
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  resultMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultScore: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  resultDate: {
    fontSize: 12,
    color: '#757575',
  },
  highlightContainer: {
    marginBottom: 8,
  },
  highlightLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#757575',
    marginBottom: 4,
  },
  highlightText: {
    fontSize: 14,
    color: '#000000',
    backgroundColor: '#FFF3CD',
    padding: 4,
    borderRadius: 4,
    marginBottom: 2,
  },
  tagsContainer: {
    marginBottom: 8,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagItem: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
  },
  matchTypes: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchType: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  matchTypeText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
  },
}); 