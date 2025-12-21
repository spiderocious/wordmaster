import { Language, getMessage, MESSAGE_KEYS } from '@shared/constants';

interface ValidatedAnswer {
  valid: boolean;
  wordScore: number;
  wordBonus: number;
  totalScore: number;
  word: string;
  category: string;
  letter: string;
  comment?: string;
  possibleAnswers?: string[];
}

interface AnswerInput {
  letter: string;
  word: string;
  category: string;
  timeLeft?: number;
}

interface GameStats {
  totalScore: number;
  totalCorrect: number;
  totalWrong: number;
  accuracy: number;
  averageScore: number;
  bestScore: number;
  worstScore: number;
  totalSpeedBonus: number;
  averageSpeedBonus: number;
  fastestAnswer: {
    word: string;
    timeLeft: number;
    timeTaken: number;
    category: string;
  } | null;
  slowestAnswer: {
    word: string;
    timeLeft: number;
    timeTaken: number;
    category: string;
  } | null;
  averageTimeLeft: number;
  averageTimeTaken: number;
  bestCategory: {
    name: string;
    averageScore: number;
    correctCount: number;
    accuracy: number;
  } | null;
  worstCategory: {
    name: string;
    averageScore: number;
    wrongCount: number;
    accuracy: number;
  } | null;
  categoryBreakdown: Array<{
    category: string;
    totalAttempts: number;
    correctAnswers: number;
    wrongAnswers: number;
    accuracy: number;
    totalScore: number;
    averageScore: number;
  }>;
  bestWord: {
    word: string;
    score: number;
    category: string;
    letter: string;
    comment?: string;
  } | null;
  bestSpeedBonus: {
    word: string;
    bonus: number;
    timeLeft: number;
    category: string;
  } | null;
  currentStreak: number;
  longestStreak: number;
  excellentCount: number;
  rareWordCount: number;
  performanceGrade: string;
  performanceMessage: string;
}

export class GameStatsService {
  private static instance: GameStatsService;
  private static readonly TIME_LIMIT = 30; // seconds

  private constructor() {}

  public static getInstance(): GameStatsService {
    if (!GameStatsService.instance) {
      GameStatsService.instance = new GameStatsService();
    }
    return GameStatsService.instance;
  }

  /**
   * Calculate comprehensive game statistics
   */
  public calculateStats(
    validatedAnswers: ValidatedAnswer[],
    originalAnswers: AnswerInput[],
    lang: Language = 'en'
  ): GameStats {
    const totalAnswers = validatedAnswers.length;

    // Overall Performance
    const totalScore = validatedAnswers.reduce((sum, ans) => sum + ans.totalScore, 0);
    const totalCorrect = validatedAnswers.filter((ans) => ans.valid).length;
    const totalWrong = validatedAnswers.filter((ans) => !ans.valid).length;
    const accuracy = totalAnswers > 0 ? (totalCorrect / totalAnswers) * 100 : 0;

    // Score Analytics
    const averageScore = totalAnswers > 0 ? totalScore / totalAnswers : 0;
    const bestScore = totalAnswers > 0 ? Math.max(...validatedAnswers.map((ans) => ans.totalScore)) : 0;
    const worstScore = totalAnswers > 0 ? Math.min(...validatedAnswers.map((ans) => ans.totalScore)) : 0;
    const totalSpeedBonus = validatedAnswers.reduce((sum, ans) => sum + ans.wordBonus, 0);
    const averageSpeedBonus = totalAnswers > 0 ? totalSpeedBonus / totalAnswers : 0;

    // Time Analytics
    const answersWithTime = validatedAnswers
      .map((ans, idx) => ({
        ...ans,
        timeLeft: originalAnswers[idx]?.timeLeft || 0,
      }))
      .filter((ans) => ans.timeLeft > 0);

    const fastestAnswer = this.getFastestAnswer(answersWithTime);
    const slowestAnswer = this.getSlowestAnswer(answersWithTime);

    const totalTimeLeft = answersWithTime.reduce((sum, ans) => sum + ans.timeLeft, 0);
    const averageTimeLeft = answersWithTime.length > 0 ? totalTimeLeft / answersWithTime.length : 0;
    const averageTimeTaken = (1.0 - averageTimeLeft) * GameStatsService.TIME_LIMIT;

    // Category Performance
    const categoryBreakdown = this.calculateCategoryBreakdown(validatedAnswers);
    const bestCategory = this.getBestCategory(categoryBreakdown);
    const worstCategory = this.getWorstCategory(categoryBreakdown);

    // Best Performances
    const bestWord = this.getBestWord(validatedAnswers);
    const bestSpeedBonus = this.getBestSpeedBonus(validatedAnswers, originalAnswers);

    // Streaks
    const { currentStreak, longestStreak } = this.calculateStreaks(validatedAnswers);

    // Comments Distribution
    const excellentCount = this.countComments(validatedAnswers, [
      getMessage(MESSAGE_KEYS.VALIDATION_EXCELLENT, lang),
      getMessage(MESSAGE_KEYS.VALIDATION_GENIUS, lang),
      getMessage(MESSAGE_KEYS.VALIDATION_INSANE, lang),
    ]);
    const rareWordCount = this.countComments(validatedAnswers, [
      getMessage(MESSAGE_KEYS.VALIDATION_RARE, lang),
    ]);

    // Performance Grade
    const performanceGrade = this.calculateGrade(accuracy, averageTimeLeft);
    const performanceMessage = this.getPerformanceMessage(performanceGrade, lang);

    return {
      totalScore,
      totalCorrect,
      totalWrong,
      accuracy,
      averageScore,
      bestScore,
      worstScore,
      totalSpeedBonus,
      averageSpeedBonus,
      fastestAnswer,
      slowestAnswer,
      averageTimeLeft,
      averageTimeTaken,
      bestCategory,
      worstCategory,
      categoryBreakdown,
      bestWord,
      bestSpeedBonus,
      currentStreak,
      longestStreak,
      excellentCount,
      rareWordCount,
      performanceGrade,
      performanceMessage,
    };
  }

  private getFastestAnswer(answersWithTime: any[]): GameStats['fastestAnswer'] {
    if (answersWithTime.length === 0) return null;

    const fastest = answersWithTime.reduce((prev, curr) =>
      curr.timeLeft > prev.timeLeft ? curr : prev
    );

    return {
      word: fastest.word,
      timeLeft: fastest.timeLeft,
      timeTaken: (1.0 - fastest.timeLeft) * GameStatsService.TIME_LIMIT,
      category: fastest.category,
    };
  }

  private getSlowestAnswer(answersWithTime: any[]): GameStats['slowestAnswer'] {
    if (answersWithTime.length === 0) return null;

    const slowest = answersWithTime.reduce((prev, curr) =>
      curr.timeLeft < prev.timeLeft ? curr : prev
    );

    return {
      word: slowest.word,
      timeLeft: slowest.timeLeft,
      timeTaken: (1.0 - slowest.timeLeft) * GameStatsService.TIME_LIMIT,
      category: slowest.category,
    };
  }

  private calculateCategoryBreakdown(validatedAnswers: ValidatedAnswer[]): GameStats['categoryBreakdown'] {
    const categoryMap = new Map<string, {
      totalAttempts: number;
      correctAnswers: number;
      wrongAnswers: number;
      totalScore: number;
    }>();

    for (const answer of validatedAnswers) {
      const existing = categoryMap.get(answer.category) || {
        totalAttempts: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        totalScore: 0,
      };

      existing.totalAttempts++;
      if (answer.valid) {
        existing.correctAnswers++;
      } else {
        existing.wrongAnswers++;
      }
      existing.totalScore += answer.totalScore;

      categoryMap.set(answer.category, existing);
    }

    return Array.from(categoryMap.entries()).map(([category, stats]) => ({
      category,
      totalAttempts: stats.totalAttempts,
      correctAnswers: stats.correctAnswers,
      wrongAnswers: stats.wrongAnswers,
      accuracy: stats.totalAttempts > 0 ? (stats.correctAnswers / stats.totalAttempts) * 100 : 0,
      totalScore: stats.totalScore,
      averageScore: stats.totalAttempts > 0 ? stats.totalScore / stats.totalAttempts : 0,
    }));
  }

  private getBestCategory(breakdown: GameStats['categoryBreakdown']): GameStats['bestCategory'] {
    if (breakdown.length === 0) return null;

    const best = breakdown.reduce((prev, curr) =>
      curr.averageScore > prev.averageScore ? curr : prev
    );

    return {
      name: best.category,
      averageScore: best.averageScore,
      correctCount: best.correctAnswers,
      accuracy: best.accuracy,
    };
  }

  private getWorstCategory(breakdown: GameStats['categoryBreakdown']): GameStats['worstCategory'] {
    if (breakdown.length === 0) return null;

    const worst = breakdown.reduce((prev, curr) =>
      curr.averageScore < prev.averageScore ? curr : prev
    );

    return {
      name: worst.category,
      averageScore: worst.averageScore,
      wrongCount: worst.wrongAnswers,
      accuracy: worst.accuracy,
    };
  }

  private getBestWord(validatedAnswers: ValidatedAnswer[]): GameStats['bestWord'] {
    if (validatedAnswers.length === 0) return null;

    const best = validatedAnswers.reduce((prev, curr) =>
      curr.totalScore > prev.totalScore ? curr : prev
    );

    return {
      word: best.word,
      score: best.totalScore,
      category: best.category,
      letter: best.letter,
      ...(best.comment && { comment: best.comment }),
    };
  }

  private getBestSpeedBonus(
    validatedAnswers: ValidatedAnswer[],
    originalAnswers: AnswerInput[]
  ): GameStats['bestSpeedBonus'] {
    if (validatedAnswers.length === 0) return null;

    const answersWithBonus = validatedAnswers
      .map((ans, idx) => ({
        ...ans,
        timeLeft: originalAnswers[idx]?.timeLeft || 0,
      }))
      .filter((ans) => ans.wordBonus > 0);

    if (answersWithBonus.length === 0) return null;

    const best = answersWithBonus.reduce((prev, curr) =>
      curr.wordBonus > prev.wordBonus ? curr : prev
    );

    return {
      word: best.word,
      bonus: best.wordBonus,
      timeLeft: best.timeLeft,
      category: best.category,
    };
  }

  private calculateStreaks(validatedAnswers: ValidatedAnswer[]): {
    currentStreak: number;
    longestStreak: number;
  } {
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < validatedAnswers.length; i++) {
      if (validatedAnswers[i].valid) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // Calculate current streak from the end
    for (let i = validatedAnswers.length - 1; i >= 0; i--) {
      if (validatedAnswers[i].valid) {
        currentStreak++;
      } else {
        break;
      }
    }

    return { currentStreak, longestStreak };
  }

  private countComments(validatedAnswers: ValidatedAnswer[], commentList: string[]): number {
    return validatedAnswers.filter(
      (ans) => ans.comment && commentList.includes(ans.comment)
    ).length;
  }

  private calculateGrade(accuracy: number, averageTimeLeft: number): string {
    const speedFactor = averageTimeLeft * 100; // Convert to 0-100

    // Weighted score: 70% accuracy, 30% speed
    const score = accuracy * 0.7 + speedFactor * 0.3;

    if (score >= 90) return 'S';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  private getPerformanceMessage(grade: string, lang: Language): string {
    const messages: Record<string, Record<Language, string>> = {
      S: {
        en: "Outstanding! You're a wordsmith!",
        es: '¡Sobresaliente! ¡Eres un maestro de las palabras!',
        fr: 'Exceptionnel! Vous êtes un maître des mots!',
      },
      A: {
        en: 'Excellent work! Keep it up!',
        es: '¡Excelente trabajo! ¡Sigue así!',
        fr: 'Excellent travail! Continuez!',
      },
      B: {
        en: 'Great job! You did well!',
        es: '¡Buen trabajo! ¡Lo hiciste bien!',
        fr: 'Bon travail! Vous avez bien fait!',
      },
      C: {
        en: 'Good effort! Keep practicing!',
        es: '¡Buen esfuerzo! ¡Sigue practicando!',
        fr: 'Bon effort! Continuez à pratiquer!',
      },
      D: {
        en: 'Nice try! Practice makes perfect!',
        es: '¡Buen intento! ¡La práctica hace al maestro!',
        fr: 'Bon essai! La pratique rend parfait!',
      },
      F: {
        en: "Don't give up! Keep trying!",
        es: '¡No te rindas! ¡Sigue intentándolo!',
        fr: 'N\'abandonnez pas! Continuez!',
      },
    };

    return messages[grade]?.[lang] || messages[grade]?.en || messages.F.en;
  }
}

export const gameStatsService = GameStatsService.getInstance();
