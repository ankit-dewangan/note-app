import { Router } from 'express';
import { versionController } from '../controllers/versionController';
import { requireAuth } from '../middleware/auth';
import { validateRequest, validateParams } from '../middleware/validation';

const router = Router();

// Apply authentication to all routes
router.use(requireAuth);

// GET /api/versions/:noteId - Get version history for a note
router.get('/:noteId', versionController.getVersionHistory);

// POST /api/versions - Create a new version
router.post('/', versionController.createVersion);

// GET /api/versions/:noteId/:versionNumber - Get a specific version
router.get('/:noteId/:versionNumber', versionController.getVersion);

// POST /api/versions/:noteId/:versionNumber/restore - Restore to a specific version
router.post('/:noteId/:versionNumber/restore', versionController.restoreVersion);

// GET /api/versions/:noteId/compare/:version1/:version2 - Compare two versions
router.get('/:noteId/compare/:version1/:version2', versionController.compareVersions);

// DELETE /api/versions/:noteId/cleanup - Clean up old versions
router.delete('/:noteId/cleanup', versionController.cleanupOldVersions);

export default router; 