export interface IWord {
  id: string;
  word: string;
  category: string;
  difficulty: number;
  startsWith: string;
  addedBy: string;
  isUserSubmitted: boolean;
  isReviewed: boolean;
  isApproved: boolean;
  aliases: string[];
  popularity: number;
  validationCount: number;
  contestCount: number;
  createdAt: Date;
  updatedAt: Date;
}
