import { Router } from 'express';
import { notesController } from '../controllers/notesController';
import { requireAuth } from '../middleware/auth';
import { validateRequest, validateParams, noteSchemas, collaboratorSchemas } from '../middleware/validation';

const router = Router();

// Apply authentication to all routes
router.use(requireAuth);

// GET /api/notes - Get all notes
router.get('/', notesController.getNotes);

// POST /api/notes/sample - Create sample notes for demonstration
router.post('/sample', notesController.createSampleNotes);

// GET /api/notes/:id - Get specific note
router.get('/:id', validateParams(noteSchemas.id), notesController.getNote);

// POST /api/notes - Create new note
router.post('/', validateRequest(noteSchemas.create), notesController.createNote);

// PUT /api/notes/:id - Update note
router.put('/:id', 
  validateParams(noteSchemas.id),
  validateRequest(noteSchemas.update),
  notesController.updateNote
);

// DELETE /api/notes/:id - Delete note
router.delete('/:id', validateParams(noteSchemas.id), notesController.deleteNote);

// POST /api/notes/:id/collaborators - Add collaborator
router.post('/:id/collaborators',
  validateParams(noteSchemas.id),
  validateRequest(collaboratorSchemas.add),
  notesController.addCollaborator
);

// DELETE /api/notes/:id/collaborators/:userId - Remove collaborator
router.delete('/:id/collaborators/:userId',
  validateParams(collaboratorSchemas.remove),
  notesController.removeCollaborator
);

export default router; 