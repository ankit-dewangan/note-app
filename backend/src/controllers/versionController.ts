import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { NoteVersion, NoteVersionDocument } from '../models/NoteVersion';
import { Note, NoteDocument } from '../models/Note';
import { logger } from '../utils/logger';

export const versionController = {
  // Get version history for a note
  async getVersionHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { noteId } = req.params as any;
      const userId = req.user!.id;

      // Get all versions for the note, sorted by version number (newest first)
      const versions = await NoteVersion.find({ noteId })
        .sort({ version: -1 })
        .limit(50) // Limit to last 50 versions for performance
        .lean();

      logger.info(`Version history retrieved for note: ${noteId} by user: ${userId}`);

      res.json({
        success: true,
        data: versions,
      });
    } catch (error) {
      logger.error('Error getting version history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get version history',
      });
    }
  },

  // Create a new version when note is updated
  async createVersion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { noteId, title, content, delta, changeType, changeDescription } = req.body as any;
      const userId = req.user!.id;

      // Get the current note to determine the next version number
      const currentNote = await Note.findById(noteId);
      if (!currentNote) {
        res.status(404).json({
          success: false,
          error: 'Note not found',
        });
        return;
      }

      // Get the latest version number
      const latestVersion = await NoteVersion.findOne({ noteId })
        .sort({ version: -1 })
        .select('version')
        .lean();

      const nextVersion = (latestVersion?.version || 0) + 1;

      // Create new version
      const version = new NoteVersion({
        noteId,
        version: nextVersion,
        title,
        content,
        delta,
        createdBy: userId,
        changeType: changeType || 'update',
        changeDescription,
        collaborators: currentNote.collaborators,
        tags: currentNote.tags,
        color: currentNote.color,
      });

      await version.save();

      logger.info(`Version ${nextVersion} created for note: ${noteId} by user: ${userId}`);

      res.json({
        success: true,
        data: version,
      });
    } catch (error) {
      logger.error('Error creating version:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create version',
      });
    }
  },

  // Restore a note to a specific version
  async restoreVersion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { noteId, versionNumber } = req.params as any;
      const userId = req.user!.id;

      // Get the specific version
      const version = await NoteVersion.findOne({ 
        noteId, 
        version: parseInt(versionNumber) 
      }).lean();

      if (!version) {
        res.status(404).json({
          success: false,
          error: 'Version not found',
        });
        return;
      }

      // Update the current note with the version data
      const updatedNote = await Note.findByIdAndUpdate(
        noteId,
        {
          title: version.title,
          content: version.content,
          tags: version.tags,
          color: version.color,
          version: version.version + 1, // Increment version
        },
        { new: true }
      );

      if (!updatedNote) {
        res.status(404).json({
          success: false,
          error: 'Note not found',
        });
        return;
      }

      // Create a new version entry for the restore action
      const restoreVersion = new NoteVersion({
        noteId,
        version: version.version + 1,
        title: version.title,
        content: version.content,
        createdBy: userId,
        changeType: 'restore',
        changeDescription: `Restored to version ${versionNumber}`,
        collaborators: updatedNote.collaborators,
        tags: updatedNote.tags,
        color: updatedNote.color,
      });

      await restoreVersion.save();

      logger.info(`Note ${noteId} restored to version ${versionNumber} by user: ${userId}`);

      res.json({
        success: true,
        data: {
          note: updatedNote,
          restoredVersion: restoreVersion,
        },
      });
    } catch (error) {
      logger.error('Error restoring version:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to restore version',
      });
    }
  },

  // Get a specific version
  async getVersion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { noteId, versionNumber } = req.params as any;
      const userId = req.user!.id;

      const version = await NoteVersion.findOne({ 
        noteId, 
        version: parseInt(versionNumber) 
      }).lean();

      if (!version) {
        res.status(404).json({
          success: false,
          error: 'Version not found',
        });
        return;
      }

      logger.info(`Version ${versionNumber} retrieved for note: ${noteId} by user: ${userId}`);

      res.json({
        success: true,
        data: version,
      });
    } catch (error) {
      logger.error('Error getting version:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get version',
      });
    }
  },

  // Compare two versions
  async compareVersions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { noteId, version1, version2 } = req.params as any;
      const userId = req.user!.id;

      const [v1, v2] = await Promise.all([
        NoteVersion.findOne({ noteId, version: parseInt(version1) }).lean(),
        NoteVersion.findOne({ noteId, version: parseInt(version2) }).lean(),
      ]);

      if (!v1 || !v2) {
        res.status(404).json({
          success: false,
          error: 'One or both versions not found',
        });
        return;
      }

      // Simple diff comparison (can be enhanced with more sophisticated diff algorithms)
      const comparison = {
        version1: v1,
        version2: v2,
        differences: {
          title: v1.title !== v2.title,
          content: v1.content !== v2.content,
          tags: JSON.stringify(v1.tags) !== JSON.stringify(v2.tags),
          color: v1.color !== v2.color,
        },
        contentDiff: {
          length1: v1.content.length,
          length2: v2.content.length,
          added: Math.max(0, v2.content.length - v1.content.length),
          removed: Math.max(0, v1.content.length - v2.content.length),
        },
      };

      logger.info(`Versions ${version1} and ${version2} compared for note: ${noteId} by user: ${userId}`);

      res.json({
        success: true,
        data: comparison,
      });
    } catch (error) {
      logger.error('Error comparing versions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to compare versions',
      });
    }
  },

  // Delete old versions (cleanup)
  async cleanupOldVersions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { noteId } = req.params as any;
      const userId = req.user!.id;

      // Keep only the last 20 versions
      const versionsToKeep = await NoteVersion.find({ noteId })
        .sort({ version: -1 })
        .limit(20)
        .select('_id');

      const versionIdsToKeep = versionsToKeep.map(v => v._id);

      const result = await NoteVersion.deleteMany({
        noteId,
        _id: { $nin: versionIdsToKeep },
      });

      logger.info(`Cleaned up old versions for note: ${noteId} by user: ${userId}, deleted: ${result.deletedCount}`);

      res.json({
        success: true,
        data: {
          deletedCount: result.deletedCount,
        },
      });
    } catch (error) {
      logger.error('Error cleaning up old versions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup old versions',
      });
    }
  },
}; 