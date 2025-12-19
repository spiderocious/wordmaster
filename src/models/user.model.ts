import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from '@shared/types';

export interface IUserDocument extends IUser, Document {}

const userSchema = new Schema<IUserDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    password: {
      type: String,
      required: true,
      select: false, // Don't include password in queries by default
    },
    avatar: {
      type: String,
      default: '',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    preferences: {
      soundEnabled: {
        type: Boolean,
        default: true,
      },
      animationsEnabled: {
        type: Boolean,
        default: true,
      },
      theme: {
        type: String,
        enum: ['light', 'dark'],
        default: 'light',
      },
      difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'easy',
      },
    },
    gamePreferences: {
      type: Schema.Types.Mixed,
      default: null,
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
    },
    stats: {
      gamesPlayed: {
        type: Number,
        default: 0,
      },
      gamesWon: {
        type: Number,
        default: 0,
      },
      totalScore: {
        type: Number,
        default: 0,
      },
      bestScore: {
        type: Number,
        default: 0,
      },
      averageScore: {
        type: Number,
        default: 0,
      },
      wordsSubmitted: {
        type: Number,
        default: 0,
      },
      wordsValidated: {
        type: Number,
        default: 0,
      },
      contestsSubmitted: {
        type: Number,
        default: 0,
      },
      contestsApproved: {
        type: Number,
        default: 0,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
userSchema.index({ username: 1 });
userSchema.index({ createdAt: -1 });

export const UserModel = mongoose.model<IUserDocument>('User', userSchema);
