export interface ICategory {
  name: string;
  displayName: string;
  timeLimit: number;
}

export interface IRound {
  roundNumber: number;
  letter: string;
  categories: ICategory[];
}

export interface IGame {
  gameId: string;
  totalRounds: number;
  rounds: IRound[];
  createdAt: Date;
}

export interface StartGameDTO {
  rounds?: number;
  supportedCategories?: string[];
}

export interface StartGameResponse {
  gameId: string;
  totalRounds: number;
  rounds: IRound[];
  createdAt: string;
}

export interface LetterCategoryCache {
  letter: string;
  categories: string[];
  wordCounts: Record<string, number>;
}
