import { Request, Response } from 'express';
import { gameService } from '@services';
import { asyncHandler, handleServiceResult, ResponseUtil } from '@utils';

export class GameController {
  /**
   * Start a new single player game
   */
  public startSingleGame = asyncHandler(async (req: Request, res: Response) => {
    const rounds = req.body?.rounds;
    const supportedCategories = req.body?.supportedCategories;

    const result = await gameService.startSingleGame({
      rounds,
      supportedCategories,
    });

    return handleServiceResult(res, result);
  });

  /**
   * Get all available categories (public endpoint)
   */
  public getAllCategories = asyncHandler(async (req: Request, res: Response) => {
    const result = await gameService.getAllCategories();

    return handleServiceResult(res, result);
  });

  /**
   * Get categories with their available letters (public endpoint)
   */
  public getCategoriesWithLetters = asyncHandler(async (req: Request, res: Response) => {
    const result = gameService.getCategoriesWithLetters();

    return handleServiceResult(res, result);
  });

  /**
   * Bulk add words to database
   */
  public bulkAddWords = asyncHandler(async (req: Request, res: Response) => {
    const { words } = req.body;

    const result = await gameService.bulkAddWords(words);

    return handleServiceResult(res, result);
  });

  /**
   * Check if words exist in database
   */
  public checkWords = asyncHandler(async (req: Request, res: Response) => {
    const { words } = req.body;

    const result = await gameService.checkWords(words);

    return handleServiceResult(res, result);
  });

  /**
   * Validate game answers and calculate scores
   */
  public validateAnswers = asyncHandler(async (req: Request, res: Response) => {
    const answers = req.body;
    const lang = ResponseUtil.extractLanguage(req);

    const result = await gameService.validateAnswers(answers, lang);

    return handleServiceResult(res, result);
  });
}

export const gameController = new GameController();
