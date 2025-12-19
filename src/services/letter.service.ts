import { WordModel } from '@models';
import { cacheService } from './cache.service';
import { logger } from '@utils';

export class LetterService {
  private static instance: LetterService;
  private static readonly LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  private static readonly CACHE_TTL = 86400; // 24 hours

  private constructor() {}

  public static getInstance(): LetterService {
    if (!LetterService.instance) {
      LetterService.instance = new LetterService();
    }
    return LetterService.instance;
  }

  /**
   * Pre-compute and cache letter-category availability for all letters
   * This runs on server startup
   */
  public async buildLetterCategoryCache(): Promise<void> {
    logger.info('Building letter-category cache...');
    const startTime = Date.now();

    try {
      for (const letter of LetterService.LETTERS) {
        const letterLower = letter.toLowerCase();

        // Get all distinct categories for this letter
        const categories = await WordModel.distinct('category', {
          startsWith: letterLower,
        });

        if (categories.length === 0) {
          logger.warn(`No categories found for letter: ${letter}`);
          continue;
        }

        // Cache available categories for this letter
        const cacheKey = `letter:categories:${letter}`;
        cacheService.set(cacheKey, categories, LetterService.CACHE_TTL);

        // Cache word count for each category-letter combination
        for (const category of categories) {
          const count = await WordModel.countDocuments({
            startsWith: letterLower,
            category: category,
          });

          const countCacheKey = `letter:${letter}:category:${category}:count`;
          cacheService.set(countCacheKey, count, LetterService.CACHE_TTL);
        }

        logger.debug(`Cached ${categories.length} categories for letter ${letter}`);
      }

      const duration = Date.now() - startTime;
      logger.info(`Letter-category cache built successfully in ${duration}ms`);
    } catch (error) {
      logger.error('Error building letter-category cache', error);
      throw error;
    }
  }

  /**
   * Get available categories for a specific letter (from cache)
   */
  public getAvailableCategoriesForLetter(letter: string): string[] {
    const cacheKey = `letter:categories:${letter.toUpperCase()}`;
    const categories = cacheService.get<string[]>(cacheKey);

    if (!categories) {
      logger.warn(`No cached categories found for letter: ${letter}`);
      return [];
    }

    return categories;
  }

  /**
   * Get word count for a specific letter-category combination (from cache)
   */
  public getWordCountForLetterCategory(letter: string, category: string): number {
    const cacheKey = `letter:${letter.toUpperCase()}:category:${category}:count`;
    const count = cacheService.get<number>(cacheKey);
    return count || 0;
  }

  /**
   * Get valid categories for a letter from user's supported categories
   * Only returns categories that have words for this letter
   */
  public getValidCategoriesForLetter(
    letter: string,
    supportedCategories: string[],
    minCategories: number = 3
  ): string[] {
    const availableCategories = this.getAvailableCategoriesForLetter(letter);

    // Filter by user's supported categories
    const validCategories = availableCategories.filter((cat) =>
      supportedCategories.includes(cat)
    );

    // Check if we have enough categories
    if (validCategories.length < minCategories) {
      return [];
    }

    return validCategories;
  }

  /**
   * Select random letters that have enough valid categories
   * Ensures all selected letters are unique
   */
  public selectRandomLetters(
    count: number,
    supportedCategories: string[],
    minCategories: number = 3
  ): string[] {
    const selectedLetters: string[] = [];
    const maxRetries = 100;
    let retries = 0;

    const shuffledLetters = [...LetterService.LETTERS].sort(() => Math.random() - 0.5);

    for (const letter of shuffledLetters) {
      if (selectedLetters.length >= count) {
        break;
      }

      if (retries >= maxRetries) {
        logger.warn('Max retries reached for letter selection');
        break;
      }

      // Check if this letter has enough valid categories
      const validCategories = this.getValidCategoriesForLetter(
        letter,
        supportedCategories,
        minCategories
      );

      if (validCategories.length >= minCategories) {
        selectedLetters.push(letter);
      } else {
        retries++;
      }
    }

    if (selectedLetters.length < count) {
      logger.warn(
        `Could only select ${selectedLetters.length} letters out of ${count} requested`
      );
    }

    return selectedLetters;
  }

  /**
   * Get all available categories across all letters (for public endpoint)
   */
  public async getAllCategories(): Promise<string[]> {
    const cacheKey = 'all:categories';

    // Try cache first
    const cachedCategories = cacheService.get<string[]>(cacheKey);
    if (cachedCategories) {
      return cachedCategories;
    }

    // Fetch from database
    const categories = await WordModel.distinct('category');
    const sortedCategories = categories.sort();

    // Cache for 24 hours
    cacheService.set(cacheKey, sortedCategories, LetterService.CACHE_TTL);

    return sortedCategories;
  }

  /**
   * Get all categories with their available letters and counts
   */
  public getCategoriesWithLetters(): Record<string, { letters: string[]; count: number }> {
    const result: Record<string, { letters: string[]; count: number }> = {};

    // Iterate through all letters and build category map
    for (const letter of LetterService.LETTERS) {
      const categories = this.getAvailableCategoriesForLetter(letter);

      for (const category of categories) {
        if (!result[category]) {
          result[category] = { letters: [], count: 0 };
        }
        result[category].letters.push(letter);
        result[category].count++;
      }
    }

    // Sort letters alphabetically for each category
    Object.keys(result).forEach((category) => {
      result[category].letters.sort();
    });

    return result;
  }
}

export const letterService = LetterService.getInstance();
