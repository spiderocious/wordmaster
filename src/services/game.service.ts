import { letterService } from './letter.service';
import { cacheService } from './cache.service';
import { gameStatsService } from './game-stats.service';
import { WordModel, ValidationModel } from '@models';
import { generateId, logger } from '@utils';
import { IGame, IRound, ICategory, StartGameDTO, ServiceResult, ServiceSuccess, ServiceError } from '@shared/types';
import { MESSAGE_KEYS, getMessage, Language } from '@shared/constants';

export class GameService {
  private static instance: GameService;

  private static readonly DEFAULT_ROUNDS = 3;
  private static readonly DEFAULT_SUPPORTED_CATEGORIES = ['name', 'place', 'animal', 'food', 'company', 'country', 'car'];
  private static readonly MIN_CATEGORIES_PER_ROUND = 3;
  private static readonly MAX_CATEGORIES_PER_ROUND = 5;
  private static readonly DEFAULT_TIME_LIMIT = 20; // seconds

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
   * Convert category names to ICategory objects with display names and timeLimit
   */
  private categoriesToObjects(categoryNames: string[]): ICategory[] {
    return categoryNames.map((name) => ({
      name,
      displayName: GameService.CATEGORY_DISPLAY_NAMES[name] || name.charAt(0).toUpperCase() + name.slice(1),
      timeLimit: GameService.DEFAULT_TIME_LIMIT,
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

  /**
   * Get validation comment based on word rarity and time left
   */
  private getValidationComment(
    wordPopularity: number,
    timeLeft: number | undefined,
    lang: Language = 'en'
  ): string | undefined {
    // If no timeLeft or very low, less likely to get comments
    if (!timeLeft || timeLeft < 0.3) {
      // Only rare words get comments when slow
      if (wordPopularity < 10) {
        return getMessage(MESSAGE_KEYS.VALIDATION_RARE, lang);
      }
      return undefined;
    }

    // Very fast (80%+ time remaining)
    if (timeLeft >= 0.8) {
      if (wordPopularity < 10) {
        return getMessage(MESSAGE_KEYS.VALIDATION_INSANE, lang); // Fast + rare
      }
      return getMessage(MESSAGE_KEYS.VALIDATION_GENIUS, lang); // Just fast
    }

    // Fast (60-79% time remaining)
    if (timeLeft >= 0.6) {
      if (wordPopularity < 20) {
        return getMessage(MESSAGE_KEYS.VALIDATION_EXCELLENT, lang); // Good + rare
      }
      return getMessage(MESSAGE_KEYS.VALIDATION_FAST, lang);
    }

    // Decent (40-59% time remaining)
    if (timeLeft >= 0.4) {
      if (wordPopularity < 15) {
        return getMessage(MESSAGE_KEYS.VALIDATION_NICE, lang); // Decent + rare
      }
      return getMessage(MESSAGE_KEYS.VALIDATION_GOOD, lang);
    }

    // Moderate (30-39% time remaining)
    if (wordPopularity < 10) {
      return getMessage(MESSAGE_KEYS.VALIDATION_RARE, lang); // Rare word
    }

    return undefined; // No comment for average performance
  }

  /**
   * Track validation in background (non-blocking)
   */
  private trackValidation(word: string, letter: string, category: string): void {
    // Fire and forget - don't await
    setImmediate(async () => {
      try {
        await ValidationModel.findOneAndUpdate(
          { word, letter, category },
          { $inc: { count: 1 } },
          { upsert: true, new: true }
        );
      } catch (error: any) {
        logger.error('Error tracking validation', { word, letter, category, error: error.message });
      }
    });
  }

  /**
   * Get possible answers for a category and letter (1-3 suggestions)
   */
  private async getPossibleAnswers(letter: string, category: string): Promise<string[]> {
    try {
      const cacheKey = `possible:${letter}:${category}`;
      const cached = cacheService.get<string[]>(cacheKey);

      if (cached) {
        return cached;
      }

      // Get random words for this letter and category
      const words = await WordModel.find({
        startsWith: letter.toLowerCase(),
        category: category.toLowerCase(),
      })
        .select('word')
        .limit(10)
        .lean();

      if (words.length === 0) {
        return [];
      }

      // Shuffle and take 1-3 random words
      const shuffled = words.sort(() => Math.random() - 0.5);
      const count = Math.min(Math.max(1, Math.floor(Math.random() * 3) + 1), shuffled.length);
      const possibleAnswers = shuffled.slice(0, count).map((w: any) => {
        // Capitalize first letter
        const word = w.word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      });

      // Cache for 5 minutes
      cacheService.set(cacheKey, possibleAnswers, 300);

      return possibleAnswers;
    } catch (error: any) {
      logger.error('Error getting possible answers', error);
      return [];
    }
  }

  /**
   * Validate game answers and calculate scores
   */
  public async validateAnswers(
    answers: Array<{
      letter: string;
      word: string;
      category: string;
      timeLeft?: number;
    }>,
    lang: Language = 'en'
  ): Promise<ServiceResult<Array<{
    valid: boolean;
    wordScore: number;
    wordBonus: number;
    totalScore: number;
    word: string;
    category: string;
    letter: string;
    comment?: string;
    possibleAnswers?: string[];
  }>>> {
    try {
      const results = [];
      const baseWordScore = 100;

      for (const answer of answers) {
        const { letter, word, category, timeLeft } = answer;

        const trimmedWord = word.trim().toLowerCase();
        const trimmedCategory = category.trim().toLowerCase();
        const letterLower = letter.toLowerCase();
        const letterUpper = letter.toUpperCase();

        const possibleAnswers = await this.getPossibleAnswers(letterLower, trimmedCategory);

        if (trimmedWord.length === 0 || trimmedWord == '') {
          results.push({
            valid: false,
            wordScore: 0,
            wordBonus: 0,
            totalScore: 0,
            word: trimmedWord,
            category: trimmedCategory,
            letter: letterUpper,
            possibleAnswers,
          });
          continue; 
        }

        // Check if word starts with the correct letter
        if (!trimmedWord.startsWith(letterLower)) {
          results.push({
            valid: false,
            wordScore: 0,
            wordBonus: 0,
            totalScore: 0,
            word: trimmedWord,
            category: trimmedCategory,
            letter: letterUpper,
            possibleAnswers,
          });
          continue;
        }

        // Try cache first for faster response
        const cacheKey = `word:validate:${trimmedWord}:${trimmedCategory}:${letterLower}`;
        let foundWord = cacheService.get<any>(cacheKey);

        if (!foundWord) {
          // Check if word exists in database with the specified category
          foundWord = await WordModel.findOne({
            word: trimmedWord,
            category: trimmedCategory,
            startsWith: letterLower,
          }).select('word category popularity').lean();

          if (foundWord) {
            // Cache valid words for 1 hour
            cacheService.set(cacheKey, foundWord, 3600);
          }
        }

        if (!foundWord) {
          results.push({
            valid: false,
            wordScore: 0,
            wordBonus: 0,
            totalScore: 0,
            word: trimmedWord,
            category: trimmedCategory,
            letter: letterUpper,
            possibleAnswers,
          });
          continue;
        }

        // Track validation in background (non-blocking)
        this.trackValidation(trimmedWord, letterLower, trimmedCategory);

        // Calculate bonus based on timeLeft (if provided)
        const wordBonus = timeLeft ? Math.floor(timeLeft * baseWordScore) : 0;
        const totalScore = baseWordScore + wordBonus;

        // Get validation comment based on word rarity and speed
        const comment = this.getValidationComment(foundWord.popularity || 0, timeLeft, lang);

        results.push({
          valid: true,
          wordScore: baseWordScore,
          wordBonus,
          totalScore,
          word: trimmedWord,
          category: trimmedCategory,
          letter: letterUpper,
          ...(comment && { comment }),
        });
      }

      return new ServiceSuccess(results);
    } catch (error: any) {
      logger.error('Error validating answers', error);
      return new ServiceError(MESSAGE_KEYS.INTERNAL_SERVER_ERROR, MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Submit game answers with validation and comprehensive statistics
   */
  public async submitGame(
    answers: Array<{
      letter: string;
      word: string;
      category: string;
      timeLeft?: number;
    }>,
    lang: Language = 'en'
  ): Promise<ServiceResult<{
    results: Array<{
      valid: boolean;
      wordScore: number;
      wordBonus: number;
      totalScore: number;
      word: string;
      category: string;
      letter: string;
      comment?: string;
      possibleAnswers?: string[];
    }>;
    stats: any;
  }>> {
    try {
      // First, validate all answers
      const validationResult = await this.validateAnswers(answers, lang);

      if (!validationResult.success || !validationResult.data) {
        return new ServiceError(
          validationResult.error || MESSAGE_KEYS.INTERNAL_SERVER_ERROR,
          validationResult.messageKey || MESSAGE_KEYS.INTERNAL_SERVER_ERROR
        );
      }

      const validatedAnswers = validationResult.data;

      // Calculate comprehensive statistics
      const stats = gameStatsService.calculateStats(validatedAnswers, answers, lang);

      return new ServiceSuccess({
        results: validatedAnswers,
        stats,
      });
    } catch (error: any) {
      logger.error('Error submitting game', error);
      return new ServiceError(MESSAGE_KEYS.INTERNAL_SERVER_ERROR, MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }
}

export const gameService = GameService.getInstance();
