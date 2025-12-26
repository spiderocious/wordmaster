import mongoose, { Schema, Document } from 'mongoose';

export interface IPlayerStats {
  userId: string;
  username: string;
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    totalScore: number;
    averageScore: number;
    highestScore: number;
    bestCategory: string;
    fastestAnswer: number;
  };
  lastGameAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPlayerStatsDocument extends IPlayerStats, Document {}

const playerStatsSchema = new Schema<IPlayerStatsDocument>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
    },
    stats: {
      gamesPlayed: {
        type: Number,
        default: 0,
        min: 0,
      },
      gamesWon: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalScore: {
        type: Number,
        default: 0,
        min: 0,
      },
      averageScore: {
        type: Number,
        default: 0,
        min: 0,
      },
      highestScore: {
        type: Number,
        default: 0,
        min: 0,
      },
      bestCategory: {
        type: String,
        default: '',
      },
      fastestAnswer: {
        type: Number,
        default: 1,
        min: 0,
        max: 1,
      },
    },
    lastGameAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
playerStatsSchema.index({ userId: 1 }, { unique: true });
playerStatsSchema.index({ 'stats.highestScore': -1 });
playerStatsSchema.index({ 'stats.gamesWon': -1 });
playerStatsSchema.index({ lastGameAt: -1 });

export const PlayerStatsModel = mongoose.model<IPlayerStatsDocument>('PlayerStats', playerStatsSchema);
