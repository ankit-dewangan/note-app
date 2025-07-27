import { Router } from 'express';
import { searchController } from '../controllers/searchController';
import { requireAuth } from '../middleware/auth';
import { validateQuery, searchSchemas } from '../middleware/validation';

const router = Router();

// Apply authentication to all routes
router.use(requireAuth);

// GET /api/search - Search notes
router.get('/', validateQuery(searchSchemas.query), searchController.searchNotes);

export default router; 