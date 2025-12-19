export interface ICategory {
  name: string;
  displayName: string;
}

export interface IRound {
  roundNumber: number;
  letter: string;
  categories: ICategory[];
  timeLimit: number;
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
