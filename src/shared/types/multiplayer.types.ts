export type GamePhase = 'waiting' | 'starting' | 'playing' | 'round_end' | 'finished';
export type PlayerRole = 'host' | 'player';
export type PlayerStatus = 'active' | 'disconnected' | 'left';

export interface ChatMessage {
  messageId: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
}

export interface GameRoomPlayer {
  userId: string | null;
  username: string;
  avatar: string;
  role: PlayerRole;
  isGuest: boolean;
  status: PlayerStatus;
  currentScore: number;
  answers: Array<{
    roundNumber: number;
    letter: string;
    word: string;
    category: string;
    timeLeft: number;
    score: number;
    valid: boolean;
  }>;
  joinedAt: number;
  lastActivity: number;
  socketId?: string;
}

export interface GameRoomRound {
  roundNumber: number;
  letter: string;
  categories: Array<{
    name: string;
    displayName: string;
    timeLimit: number;
  }>;
  startedAt?: number;
  submissions: Map<string, boolean>;
}

export interface GameRoomConfig {
  roundsCount: number;
  supportedCategories: string[];
  excludedLetters: string[];
}

export interface GameRoom {
  roomId: string;
  joinCode: string;
  hostId: string;
  phase: GamePhase;
  players: Map<string, GameRoomPlayer>;
  maxPlayers: number;
  currentRound: number;
  totalRounds: number;
  rounds: GameRoomRound[];
  config: GameRoomConfig;
  chatMessages: ChatMessage[];
  createdAt: number;
  startedAt?: number;
  lastActivity: number;
  winner?: {
    userId: string;
    username: string;
    score: number;
  };
}

export interface RoomStateResponse {
  roomId: string;
  joinCode: string;
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  players: Array<{
    userId: string | null;
    username: string;
    avatar: string;
    role: PlayerRole;
    status: PlayerStatus;
    currentScore: number;
    isGuest: boolean;
  }>;
  round?: {
    roundNumber: number;
    letter: string;
    categories: Array<{
      name: string;
      displayName: string;
      timeLimit: number;
    }>;
    startedAt?: number;
  };
  winner?: {
    userId: string;
    username: string;
    score: number;
  };
  timestamp: number;
}
