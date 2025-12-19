import { letterService } from './letter.service';
import { WordModel } from '@models';
import { generateId, logger } from '@utils';
import { IGame, IRound, ICategory, StartGameDTO, ServiceResult, ServiceSuccess, ServiceError } from '@shared/types';
import { MESSAGE_KEYS } from '@shared/constants';

export class GameService {
  private static instance: GameService;

  private static readonly DEFAULT_ROUNDS = 3;
  private static readonly DEFAULT_SUPPORTED_CATEGORIES = ['name', 'place', 'animal', 'city'];
  private static readonly MIN_CATEGORIES_PER_ROUND = 3;
  private static readonly MAX_CATEGORIES_PER_ROUND = 5;
  private static readonly DEFAULT_TIME_LIMIT = 30; // seconds

  private static readonly CATEGORY_DISPLAY_NAMES: Record<string, string> = {
    name: 'Name',
    animal: 'Animal',
    place: 'Place',
    city: 'City',
    company: 'Company',
    food: 'Food',
    country: 'Country',
    color: 'Color',
    app: 'App',
    language: 'Language',
    disease: 'Disease',
    currency: 'Currency',
    bible: 'Bible',
    car: 'Car',
  };

  private constructor() {}

  public static getInstance(): GameService {
    if (!GameService.instance) {
      GameService.instance = new GameService();
    }
    return GameService.instance;
  }

  /**
   * Generate unique game ID
   */
  private generateGameId(): string {
    return generateId(16, 'GAME', Date.now().toString());
  }

  /**
   * Get random number of categories (between 3 and 5)
   */
  private getRandomCategoryCount(): number {
    return Math.floor(
      Math.random() *
        (GameService.MAX_CATEGORIES_PER_ROUND - GameService.MIN_CATEGORIES_PER_ROUND + 1)
    ) + GameService.MIN_CATEGORIES_PER_ROUND;
  }

  /**
   * Select random categories from available ones
   */
  private selectRandomCategories(availableCategories: string[], count: number): string[] {
    const shuffled = [...availableCategories].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, availableCategories.length));
  }

  /**
   * Convert category names to ICategory objects with display names
   */
  private categoriesToObjects(categoryNames: string[]): ICategory[] {
    return categoryNames.map((name) => ({
      name,
      displayName: GameService.CATEGORY_DISPLAY_NAMES[name] || name.charAt(0).toUpperCase() + name.slice(1),
    }));
  }

  /**
   * Generate a single round
   */
  private generateRound(
    roundNumber: number,
    letter: string,
    supportedCategories: string[]
  ): IRound | null {
    // Get valid categories for this letter
    const validCategories = letterService.getValidCategoriesForLetter(
      letter,
      supportedCategories,
      GameService.MIN_CATEGORIES_PER_ROUND
    );

    if (validCategories.length < GameService.MIN_CATEGORIES_PER_ROUND) {
      logger.warn(`Not enough categories for letter ${letter}. Available: ${validCategories.length}`);
      return null;
    }

    // Randomly select 3-5 categories
    const categoryCount = this.getRandomCategoryCount();
    const selectedCategories = this.selectRandomCategories(validCategories, categoryCount);

    return {
      roundNumber,
      letter,
      categories: this.categoriesToObjects(selectedCategories),
      timeLimit: GameService.DEFAULT_TIME_LIMIT,
    };
  }

  /**
   * Start a new single player game
   */
  public async startSingleGame(data: StartGameDTO): Promise<ServiceResult<IGame>> {
    try {
      const rounds = data.rounds || GameService.DEFAULT_ROUNDS;
      const supportedCategories = data.supportedCategories || GameService.DEFAULT_SUPPORTED_CATEGORIES;

      // Validate rounds
      if (rounds < 1 || rounds > 10) {
        return new ServiceError('Rounds must be between 1 and 10', MESSAGE_KEYS.BAD_REQUEST);
      }

      // Validate supported categories
      if (!Array.isArray(supportedCategories) || supportedCategories.length === 0) {
        return new ServiceError('Supported categories must be a non-empty array', MESSAGE_KEYS.BAD_REQUEST);
      }

      // Select unique random letters for all rounds
      const selectedLetters = letterService.selectRandomLetters(
        rounds,
        supportedCategories,
        GameService.MIN_CATEGORIES_PER_ROUND
      );

      if (selectedLetters.length < rounds) {
        return new ServiceError(
          `Could not generate enough rounds. Only ${selectedLetters.length} valid letters found for your category selection.`,
          MESSAGE_KEYS.BAD_REQUEST
        );
      }

      // Generate all rounds
      const gameRounds: IRound[] = [];
      for (let i = 0; i < selectedLetters.length; i++) {
        const round = this.generateRound(i + 1, selectedLetters[i], supportedCategories);

        if (!round) {
          logger.warn(`Failed to generate round ${i + 1} for letter ${selectedLetters[i]}`);
          continue;
        }

        gameRounds.push(round);
      }

      if (gameRounds.length === 0) {
        return new ServiceError('Failed to generate any valid rounds', MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
      }

      // Create game object
      const game: IGame = {
        gameId: this.generateGameId(),
        totalRounds: gameRounds.length,
        rounds: gameRounds,
        createdAt: new Date(),
      };

      logger.info(`Game ${game.gameId} created with ${game.totalRounds} rounds`);

      return new ServiceSuccess(game, MESSAGE_KEYS.SUCCESS);
    } catch (error: any) {
      logger.error('Error starting single game', error);
      return new ServiceError(MESSAGE_KEYS.INTERNAL_SERVER_ERROR, MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get all available categories
   */
  public async getAllCategories(): Promise<ServiceResult<string[]>> {
    try {
      const categories = await letterService.getAllCategories();
      return new ServiceSuccess(categories);
    } catch (error: any) {
      logger.error('Error getting all categories', error);
      return new ServiceError(MESSAGE_KEYS.INTERNAL_SERVER_ERROR, MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get categories with their available letters
   */
  public getCategoriesWithLetters(): ServiceResult<Record<string, { letters: string[]; count: number }>> {
    try {
      const categoriesWithLetters = letterService.getCategoriesWithLetters();
      return new ServiceSuccess(categoriesWithLetters);
    } catch (error: any) {
      logger.error('Error getting categories with letters', error);
      return new ServiceError(MESSAGE_KEYS.INTERNAL_SERVER_ERROR, MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Bulk add words to the database
   */
  public async bulkAddWords(words: Array<{ word: string; category: string }>): Promise<ServiceResult<{
    added: string[];
    addedCount: number;
    skipped: string[];
    skippedCount: number;
    errors: Array<{ word: string; reason: string }>;
  }>> {
    try {
      const results = {
        added: [] as string[],
        addedCount: 0,
        skipped: [] as string[],
        skippedCount: 0,
        errors: [] as Array<{ word: string; reason: string }>,
      };

      for (const wordData of words) {
        try {
          const { word, category } = wordData;

          // Validate input
          if (!word || !category) {
            results.errors.push({
              word: word || 'unknown',
              reason: 'Invalid word data - missing word or category',
            });
            continue;
          }

          const trimmedWord = word.trim().toLowerCase();
          const trimmedCategory = category.trim().toLowerCase();

          if (trimmedWord.length < 2) {
            results.errors.push({
              word: trimmedWord,
              reason: 'Word too short (minimum 2 characters)',
            });
            continue;
          }

          // Check if word already exists
          const existingWord = await WordModel.findOne({
            word: trimmedWord,
            category: trimmedCategory
          });

          if (existingWord) {
            results.skipped.push(trimmedWord);
            results.skippedCount++;
            continue;
          }

          // Get first letter
          const startsWith = trimmedWord.charAt(0).toLowerCase();

          // Generate unique ID
          const wordId = generateId(16, 'WORD', Date.now().toString());

          // Create new word
          const newWord = new WordModel({
            id: wordId,
            word: trimmedWord,
            category: trimmedCategory,
            difficulty: 1,
            startsWith,
            addedBy: 'admin',
            isUserSubmitted: false,
            isReviewed: true,
            isApproved: true,
            aliases: [],
            popularity: 0,
            validationCount: 0,
            contestCount: 0,
          });

          await newWord.save();
          results.added.push(trimmedWord);
          results.addedCount++;

          logger.debug(`Added word: ${trimmedWord} (${trimmedCategory})`);
        } catch (error: any) {
          results.errors.push({
            word: wordData.word || 'unknown',
            reason: error.message,
          });
        }
      }

      logger.info(`Bulk add complete: ${results.addedCount} added, ${results.skippedCount} skipped, ${results.errors.length} errors`);

      return new ServiceSuccess(results, MESSAGE_KEYS.SUCCESS);
    } catch (error: any) {
      logger.error('Error in bulk add words', error);
      return new ServiceError(MESSAGE_KEYS.INTERNAL_SERVER_ERROR, MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Check if words exist in the database
   */
  public async checkWords(words: string[]): Promise<ServiceResult<Array<{
    word: string;
    found: boolean;
    categories: string[];
    totalFound: number;
  }>>> {
    try {
      const results = [];

      for (const word of words) {
        const trimmedWord = word.trim().toLowerCase();

        // Find all occurrences of this word across all categories
        const foundWords = await WordModel.find({
          word: trimmedWord
        }).select('category').lean();

        const categories = foundWords.map((w: any) => w.category);

        results.push({
          word: trimmedWord,
          found: foundWords.length > 0,
          categories: categories,
          totalFound: foundWords.length,
        });
      }

      return new ServiceSuccess(results);
    } catch (error: any) {
      logger.error('Error checking words', error);
      return new ServiceError(MESSAGE_KEYS.INTERNAL_SERVER_ERROR, MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }
}

export const gameService = GameService.getInstance();
