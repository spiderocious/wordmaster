import mongoose, { Schema, Document } from 'mongoose';

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

export interface IWordDocument extends IWord, Document {}

const wordSchema = new Schema<IWordDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    word: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    difficulty: {
      type: Number,
      default: 1,
    },
    startsWith: {
      type: String,
      required: true,
      index: true,
    },
    addedBy: {
      type: String,
      default: 'admin',
    },
    isUserSubmitted: {
      type: Boolean,
      default: false,
    },
    isReviewed: {
      type: Boolean,
      default: false,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    aliases: {
      type: [String],
      default: [],
    },
    popularity: {
      type: Number,
      default: 0,
    },
    validationCount: {
      type: Number,
      default: 0,
    },
    contestCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
wordSchema.index({ startsWith: 1, category: 1 });
wordSchema.index({ category: 1, startsWith: 1 });

export const WordModel = mongoose.model<IWordDocument>('Word', wordSchema);
