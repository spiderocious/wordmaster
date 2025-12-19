export interface IUser {
  id: string;
  username: string;
  password?: string;
  avatar?: string;
  isVerified: boolean;
  preferences: {
    soundEnabled: boolean;
    animationsEnabled: boolean;
    theme: 'light' | 'dark';
    difficulty: 'easy' | 'medium' | 'hard';
  };
  gamePreferences: any;
  level: number;
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    totalScore: number;
    bestScore: number;
    averageScore: number;
    wordsSubmitted: number;
    wordsValidated: number;
    contestsSubmitted: number;
    contestsApproved: number;
  };
  isActive: boolean;
  createdAt: Date;
  lastLoginAt: Date;
  updatedAt: Date;
}

export interface CreateUserDTO {
  username: string;
  avatar?: string;
  preferences?: Partial<IUser['preferences']>;
}

export interface SignupDTO {
  username: string;
  password: string;
}

export interface LoginDTO {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<IUser, 'password'>;
}

export interface UsernameCheckDTO {
  username: string;
}

export interface UsernameCheckResponse {
  available: boolean;
  username: string;
}
