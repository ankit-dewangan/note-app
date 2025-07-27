import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Note } from '../models/Note';
import { logger } from '../utils/logger';

export const searchController = {
  // Search notes
  async searchNotes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { query, page = 1, limit = 20, tags, collaborators } = req.query as any;

      const skip = (Number(page) - 1) * Number(limit);

      // Build search query
      const searchQuery: any = {
        $or: [
          { createdBy: userId },
          { collaborators: userId }
        ],
        $text: { $search: query }
      };

      // Add filters
      if (tags && tags.length > 0) {
        searchQuery.tags = { $in: tags };
      }

      if (collaborators && collaborators.length > 0) {
        searchQuery.collaborators = { $in: collaborators };
      }

      // Execute search
      const [notes, total] = await Promise.all([
        Note.find(searchQuery)
          .sort({ score: { $meta: 'textScore' }, updatedAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Note.countDocuments(searchQuery)
      ]);

      // Process results to add highlights
      const searchResults = notes.map((note: any) => ({
        id: note.id,
        title: note.title,
        content: note.content,
        score: note.score || 0,
        highlights: {
          title: note.title.toLowerCase().includes(query.toLowerCase()) ? [note.title] : [],
          content: note.content.toLowerCase().includes(query.toLowerCase()) ? [note.content.substring(0, 200) + '...'] : []
        }
      }));

      res.json({
        success: true,
        data: searchResults,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
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