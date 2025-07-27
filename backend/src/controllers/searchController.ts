import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Note } from '../models/Note';
import { logger } from '../utils/logger';

// Helper function to highlight matching text
function highlightText(text: string, query: string, maxLength?: number): string[] {
  const highlights: string[] = [];
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  let startIndex = 0;
  while (true) {
    const index = textLower.indexOf(queryLower, startIndex);
    if (index === -1) break;
    
    const before = text.substring(Math.max(0, index - 20), index);
    const match = text.substring(index, index + query.length);
    const after = text.substring(index + query.length, index + query.length + 20);
    
    let highlight = `${before}**${match}**${after}`;
    
    if (maxLength && highlight.length > maxLength) {
      highlight = highlight.substring(0, maxLength) + '...';
    }
    
    highlights.push(highlight);
    startIndex = index + 1;
    
    // Limit number of highlights
    if (highlights.length >= 3) break;
  }
  
  return highlights;
}

export const searchController = {
  // Advanced fuzzy search notes
  async searchNotes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { query, page = 1, limit = 20, tags, collaborators, searchType = 'all' } = req.query as any;

      if (!query || query.trim().length === 0) {
        res.json({
          success: true,
          data: [],
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: 0,
            totalPages: 0
          }
        });
        return;
      }

      const skip = (Number(page) - 1) * Number(limit);
      const searchQuery = query.trim();

      // Build search query with fuzzy matching
      const searchConditions: any[] = [];

      // Search in title with fuzzy matching
      if (searchType === 'all' || searchType === 'title') {
        searchConditions.push({
          title: {
            $regex: searchQuery,
            $options: 'i' // Case insensitive
          }
        });
      }

      // Search in content with fuzzy matching
      if (searchType === 'all' || searchType === 'content') {
        searchConditions.push({
          content: {
            $regex: searchQuery,
            $options: 'i' // Case insensitive
          }
        });
      }

      // Search in tags
      if (searchType === 'all' || searchType === 'tags') {
        searchConditions.push({
          tags: {
            $regex: searchQuery,
            $options: 'i'
          }
        });
      }

      // Build final query
      const finalQuery: any = {
        $or: searchConditions
      };

      // Add filters
      if (tags && tags.length > 0) {
        finalQuery.tags = { $in: Array.isArray(tags) ? tags : [tags] };
      }

      if (collaborators && collaborators.length > 0) {
        finalQuery.collaborators = { $in: Array.isArray(collaborators) ? collaborators : [collaborators] };
      }

      // Execute search
      const [notes, total] = await Promise.all([
        Note.find(finalQuery)
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Note.countDocuments(finalQuery)
      ]);

      // Process results with enhanced highlighting and scoring
      const searchResults = notes.map((note: any) => {
        const titleMatch = note.title.toLowerCase().includes(searchQuery.toLowerCase());
        const contentMatch = note.content.toLowerCase().includes(searchQuery.toLowerCase());
        const tagsMatch = note.tags && note.tags.some((tag: string) => 
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Calculate relevance score
        let score = 0;
        if (titleMatch) score += 3; // Title matches are most relevant
        if (contentMatch) score += 1; // Content matches
        if (tagsMatch) score += 2; // Tag matches are important

        // Generate highlights
        const highlights = {
          title: titleMatch ? highlightText(note.title, searchQuery) : [],
          content: contentMatch ? highlightText(note.content, searchQuery, 200) : [],
          tags: tagsMatch ? note.tags.filter((tag: string) => 
            tag.toLowerCase().includes(searchQuery.toLowerCase())
          ) : []
        };

        return {
          id: note._id || note.id,
          title: note.title,
          content: note.content,
          tags: note.tags || [],
          createdBy: note.createdBy,
          collaborators: note.collaborators || [],
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          score,
          highlights,
          matchType: {
            title: titleMatch,
            content: contentMatch,
            tags: tagsMatch
          }
        };
      });

      // Sort by relevance score (highest first)
      searchResults.sort((a, b) => b.score - a.score);

      res.json({
        success: true,
        data: searchResults,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        },
        searchInfo: {
          query: searchQuery,
          searchType,
          totalResults: total
        }
      });
    } catch (error) {
      logger.error('Error searching notes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search notes'
      });
    }
  }
}; 