import mongoose, { Schema, Document } from 'mongoose';

export interface IGameSession {
  roomId: string;
  joinCode: string;
  hostId: string;
  players: Array<{
    userId: string | null;
    username: string;
    isGuest: boolean;
    joinedAt: Date;
  }>;
  config: {
    roundsCount: number;
    supportedCategories: string[];
    excludedLetters: string[];
  };
  roundResults: Array<{
    roundNumber: number;
    letter: string;
    categories: string[];
    playerAnswers: Array<{
      userId: string;
      username: string;
      answers: Array<{
        category: string;
        word: string;
        valid: boolean;
        score: number;
        timeLeft: number;
      }>;
      roundScore: number;
      totalScore: number;
    }>;
    completedAt: Date;
  }>;
  finalScores: Array<{
    userId: string;
    username: string;
    totalScore: number;
    rank: number;
  }>;
  winner?: {
    userId: string;
    username: string;
    score: number;
  };
  status: 'active' | 'completed' | 'abandoned';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface IGameSessionDocument extends IGameSession, Document {}

const gameSessionSchema = new Schema<IGameSessionDocument>(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    joinCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
      length: 6,
    },
    hostId: {
      type: String,
      required: true,
      index: true,
    },
    players: [
      {
        userId: {
          type: String,
          default: null,
        },
        username: {
          type: String,
          required: true,
        },
        isGuest: {
          type: Boolean,
          default: false,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    config: {
      roundsCount: {
        type: Number,
        required: true,
        min: 1,
        max: 10,
        default: 4,
      },
      supportedCategories: {
        type: [String],
        required: true,
        default: ['name', 'place', 'animal', 'food'],
      },
      excludedLetters: {
        type: [String],
        default: [],
      },
    },
    roundResults: [
      {
        roundNumber: {
          type: Number,
          required: true,
        },
        letter: {
          type: String,
          required: true,
        },
        categories: {
          type: [String],
          required: true,
        },
        playerAnswers: [
          {
            userId: {
              type: String,
              required: true,
            },
            username: {
              type: String,
              required: true,
            },
            answers: [
              {
                category: {
                  type: String,
                  required: true,
                },
                word: {
                  type: String,
                  required: true,
                },
                valid: {
                  type: Boolean,
                  required: true,
                },
                score: {
                  type: Number,
                  required: true,
                  default: 0,
                },
                timeLeft: {
                  type: Number,
                  required: true,
                  min: 0,
                  max: 1,
                },
              },
            ],
            roundScore: {
              type: Number,
              required: true,
              default: 0,
            },
            totalScore: {
              type: Number,
              required: true,
              default: 0,
            },
          },
        ],
        completedAt: {
          type: Date,
          required: true,
        },
      },
    ],
    finalScores: [
      {
        userId: {
          type: String,
          required: true,
        },
        username: {
          type: String,
          required: true,
        },
        totalScore: {
          type: Number,
          required: true,
          default: 0,
        },
        rank: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
    winner: {
      userId: {
        type: String,
      },
      username: {
        type: String,
      },
      score: {
        type: Number,
        default: 0,
      },
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'abandoned'],
      default: 'active',
      index: true,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
gameSessionSchema.index({ hostId: 1, createdAt: -1 });
gameSessionSchema.index({ status: 1, createdAt: -1 });
gameSessionSchema.index({ joinCode: 1 }, { unique: true });
gameSessionSchema.index({ roomId: 1 }, { unique: true });

export const GameSessionModel = mongoose.model<IGameSessionDocument>('GameSession', gameSessionSchema);
