import mongoose, { Schema, Document } from 'mongoose';

export interface IValidation {
  word: string;
  letter: string;
  category: string;
  count: number;
}

export interface IValidationDocument extends IValidation, Document {}

const validationSchema = new Schema<IValidationDocument>(
  {
    word: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    letter: {
      type: String,
      required: true,
      lowercase: true,
      maxLength: 1,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    count: {
      type: Number,
      required: true,
      default: 1,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique word+letter+category combination
validationSchema.index({ word: 1, letter: 1, category: 1 }, { unique: true });

// Index for efficient queries
validationSchema.index({ word: 1 });
validationSchema.index({ letter: 1 });
validationSchema.index({ category: 1 });

export const ValidationModel = mongoose.model<IValidationDocument>('Validation', validationSchema);
