import { Response } from 'express';
import { Note } from '../models/Note';
import { User } from '../models/User';
import { NoteVersion } from '../models/NoteVersion';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { randomBytes } from 'crypto';

// Generate encryption key function
function generateEncryptionKey(): string {
  return randomBytes(32).toString('hex');
}

// Simple encryption function for sample notes (using global key)
function encryptContent(content: string): string {
  // Use a simple XOR encryption with a global key for sample notes
  const globalKey = 'global-collaborative-notes-key-2024';
  const encodedContent = Buffer.from(content, 'utf8');
  const encodedKey = Buffer.from(globalKey, 'utf8');
  
  const encrypted = Buffer.alloc(encodedContent.length);
  for (let i = 0; i < encodedContent.length; i++) {
    encrypted[i] = encodedContent[i] ^ encodedKey[i % encodedKey.length];
  }
  
  return encrypted.toString('base64');
}

export const notesController = {
  // Get all notes (global access)
  async getNotes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 20, archived = false } = req.query as any;

      const skip = (Number(page) - 1) * Number(limit);
      
      // Get all notes globally, not just user-specific ones
      const query = {
        isArchived: archived === 'true'
      };

      const [notes, total] = await Promise.all([
        Note.find(query)
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Note.countDocuments(query)
      ]);

      res.json({
        success: true,
        data: notes,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      logger.error('Error fetching notes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notes'
      });
    }
  },

  // Get a specific note by ID (global access)
  async getNote(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params as any;

      // Get any note globally, not just user-specific ones
      const note = await Note.findById(id).lean();

      if (!note) {
        res.status(404).json({
          success: false,
          error: 'Note not found'
        });
        return;
      }

      res.json({
        success: true,
        data: note
      });
    } catch (error) {
      logger.error('Error fetching note:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch note'
      });
    }
  },

  // Create a new note
  async createNote(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { title, content, collaborators = [], tags = [], color } = req.body as any;

      // Check if user has encryption key, generate if not
      let user = await User.findOne({ id: userId });
      if (!user!.encryptionKey) {
        const encryptionKey = generateEncryptionKey();
        await User.findOneAndUpdate(
          { id: userId },
          { encryptionKey }
        );
        user!.encryptionKey = encryptionKey;
      }

      // Validate collaborators exist
      if (collaborators.length > 0) {
        const existingUsers = await User.find({
          email: { $in: collaborators }
        });
        
        if (existingUsers.length !== collaborators.length) {
          res.status(400).json({
            success: false,
            error: 'Some collaborators do not exist'
          });
          return;
        }
      }

      const note = new Note({
        title,
        content, // Content should be encrypted on client side
        createdBy: userId,
        collaborators,
        tags,
        color: color || '#007AFF'
      });

      await note.save();

      // Create initial version
      const initialVersion = new NoteVersion({
        noteId: note.id,
        version: 1,
        title,
        content,
        createdBy: userId,
        changeType: 'create',
        changeDescription: 'Note created',
        collaborators,
        tags,
        color: color || '#007AFF'
      });

      await initialVersion.save();

      logger.info(`Note created: ${note.id} by user: ${userId} with version 1`);

      res.status(201).json({
        success: true,
        data: note
      });
    } catch (error) {
      logger.error('Error creating note:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create note'
      });
    }
  },

  // Update a note (global access)
  async updateNote(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params as any;
      const userId = req.user!.id;
      const updateData = req.body as any;

      // Find any note globally
      const note = await Note.findById(id);

      if (!note) {
        res.status(404).json({
          success: false,
          error: 'Note not found'
        });
        return;
      }

      // Validate collaborators if being updated
      if (updateData.collaborators) {
        const existingUsers = await User.find({
          email: { $in: updateData.collaborators }
        });
        
        if (existingUsers.length !== updateData.collaborators.length) {
          res.status(400).json({
            success: false,
            error: 'Some collaborators do not exist'
          });
          return;
        }
      }

      // Update the note
      Object.assign(note, updateData);
      await note.save();

      // Create new version
      const latestVersion = await NoteVersion.findOne({ noteId: note.id })
        .sort({ version: -1 })
        .select('version')
        .lean();

      const nextVersion = (latestVersion?.version || 0) + 1;

      const newVersion = new NoteVersion({
        noteId: note.id,
        version: nextVersion,
        title: note.title,
        content: note.content,
        createdBy: userId,
        changeType: 'update',
        changeDescription: 'Note updated',
        collaborators: note.collaborators,
        tags: note.tags,
        color: note.color
      });

      await newVersion.save();

      logger.info(`Note updated: ${note.id} by user: ${userId} with version ${nextVersion}`);

      res.json({
        success: true,
        data: note
      });
    } catch (error) {
      logger.error('Error updating note:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update note'
      });
    }
  },

  // Delete a note (global access)
  async deleteNote(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params as any;
      const userId = req.user!.id;

      // Find any note globally
      const note = await Note.findById(id);

      if (!note) {
        res.status(404).json({
          success: false,
          error: 'Note not found'
        });
        return;
      }

      await Note.deleteOne({ _id: id });

      logger.info(`Note deleted: ${id} by user: ${userId}`);

      res.json({
        success: true,
        message: 'Note deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting note:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete note'
      });
    }
  },

  // Add collaborator to note
  async addCollaborator(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params as any;
      const userId = req.user!.id;
      const { email } = req.body as any;

      // Check if user has permission to add collaborators
      const note = await Note.findOne({
        _id: id,
        createdBy: userId
      });

      if (!note) {
        res.status(404).json({
          success: false,
          error: 'Note not found or you do not have permission to add collaborators'
        });
        return;
      }

      // Check if collaborator exists
      const collaborator = await User.findOne({ email });
      if (!collaborator) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Check if already a collaborator
      if (note.collaborators.includes(collaborator.id)) {
        res.status(400).json({
          success: false,
          error: 'User is already a collaborator'
        });
        return;
      }

      note.collaborators.push(collaborator.id);
      await note.save();

      logger.info(`Collaborator added: ${collaborator.id} to note: ${id}`);

      res.json({
        success: true,
        data: note
      });
    } catch (error) {
      logger.error('Error adding collaborator:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add collaborator'
      });
    }
  },

  // Remove collaborator from note
  async removeCollaborator(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id, userId: collaboratorId } = req.params as any;
      const userId = req.user!.id;

      // Check if user has permission to remove collaborators
      const note = await Note.findOne({
        _id: id,
        createdBy: userId
      });

      if (!note) {
        res.status(404).json({
          success: false,
          error: 'Note not found or you do not have permission to remove collaborators'
        });
        return;
      }

      // Remove collaborator
      note.collaborators = note.collaborators.filter(id => id !== collaboratorId);
      await note.save();

      logger.info(`Collaborator removed: ${collaboratorId} from note: ${id}`);

      res.json({
        success: true,
        data: note
      });
    } catch (error) {
      logger.error('Error removing collaborator:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove collaborator'
      });
    }
  },

  // Create sample notes for demonstration (global access)
  async createSampleNotes(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      // Check if sample notes already exist
      const existingNotes = await Note.find({ title: { $regex: /^Sample Note/ } });
      if (existingNotes.length > 0) {
        res.json({
          success: true,
          message: 'Sample notes already exist',
          data: existingNotes
        });
        return;
      }

      // Create sample notes
      const sampleNotes = [
        {
          title: 'Sample Note 1 - Welcome',
          content: encryptContent('Welcome to the global collaborative notes app! This note is shared across all users.'),
          createdBy: userId,
          collaborators: [],
          tags: ['welcome', 'introduction'],
          color: '#007AFF'
        },
        {
          title: 'Sample Note 2 - Collaboration',
          content: encryptContent('This note demonstrates real-time collaboration. Multiple users can edit this note simultaneously.'),
          createdBy: userId,
          collaborators: [],
          tags: ['collaboration', 'demo'],
          color: '#4CAF50'
        },
        {
          title: 'Sample Note 3 - Features',
          content: encryptContent('Features include: Real-time editing, File attachments, Search functionality, and more!'),
          createdBy: userId,
          collaborators: [],
          tags: ['features', 'guide'],
          color: '#FF9800'
        }
      ];

      const createdNotes = await Note.insertMany(sampleNotes);

      logger.info(`Created ${createdNotes.length} sample notes`);

      res.json({
        success: true,
        message: 'Sample notes created successfully',
        data: createdNotes
      });
    } catch (error) {
      logger.error('Error creating sample notes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create sample notes'
      });
    }
  }
}; 