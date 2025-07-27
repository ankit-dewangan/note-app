import { Router } from 'express';
import { filesController } from '../controllers/filesController';
import { requireAuth } from '../middleware/auth';
import { validateRequest, validateParams, fileSchemas } from '../middleware/validation';

const router = Router();

// Apply authentication to all routes
router.use(requireAuth);

// POST /api/files/upload-url - Get signed upload URL
router.post('/upload-url', validateRequest(fileSchemas.upload), filesController.getUploadUrl);

// GET /api/files/note/:noteId - Get files by note ID
router.get('/note/:noteId', filesController.getFilesByNoteId);

// GET /api/files/:id - Get file metadata
router.get('/:id', validateParams(fileSchemas.id), filesController.getFileMetadata);

// DELETE /api/files/:id - Delete file
router.delete('/:id', validateParams(fileSchemas.id), filesController.deleteFile);

export default router; 