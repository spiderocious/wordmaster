import { body } from 'express-validator';

export const startGameValidation = [
  body('rounds')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Rounds must be an integer between 1 and 10'),

  body('supportedCategories')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Supported categories must be a non-empty array'),

  body('supportedCategories.*')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Each category must be a non-empty string'),
];

export const bulkAddWordsValidation = [
  body('words')
    .isArray({ min: 1 })
    .withMessage('Words must be a non-empty array'),

  body('words.*.word')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Each word must be a non-empty string'),

  body('words.*.category')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Each category must be a non-empty string'),
];

export const checkWordsValidation = [
  body('words')
    .isArray({ min: 1 })
    .withMessage('Words must be a non-empty array'),

  body('words.*')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Each word must be a non-empty string'),
];

export const validateAnswersValidation = [
  body()
    .isArray({ min: 1 })
    .withMessage('Answers must be a non-empty array'),

  body('*.letter')
    .isString()
    .trim()
    .isLength({ min: 1, max: 1 })
    .withMessage('Letter must be a single character'),

  body('*.category')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Category must be a non-empty string'),

  body('*.timeLeft')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Time left must be a decimal between 0 and 1'),
];
