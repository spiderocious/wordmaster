import { Router } from 'express';
import { gameController } from '@controllers';
import { startGameValidation, bulkAddWordsValidation, checkWordsValidation, validateRequest } from '@requests';

const router = Router();

// Public endpoint - get all available categories
router.get('/categories', gameController.getAllCategories.bind(gameController));

// Public endpoint - get categories with their available letters
router.get('/categories/letters', gameController.getCategoriesWithLetters.bind(gameController));

// Start single player game
router.post(
  '/single/start',
  startGameValidation,
  validateRequest,
  gameController.startSingleGame.bind(gameController)
);

// Bulk add words to database
router.post(
  '/words/bulk',
  bulkAddWordsValidation,
  validateRequest,
  gameController.bulkAddWords.bind(gameController)
);

// Check if words exist in database
router.post(
  '/words/check',
  checkWordsValidation,
  validateRequest,
  gameController.checkWords.bind(gameController)
);

export default router;
