import { Request, Response, NextFunction } from 'express';
import { ResponseUtil } from './response.util';
import { logger } from './logger.util';
import { ServiceResult } from '@shared/types';
import { MessageKey, MESSAGE_KEYS } from '@shared/constants';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

/**
 * Wrapper for async route handlers that automatically handles errors and sets language
 */
export const asyncHandler = (handler: AsyncHandler) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract and set language for this request
      const lang = ResponseUtil.extractLanguage(req);
      ResponseUtil.setLanguage(lang);

      await handler(req, res, next);
    } catch (error: any) {
      logger.error('Unhandled error in controller', error);
      ResponseUtil.serverError(res, MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  };
};

/**
 * Handle service result and send appropriate response
 */
export const handleServiceResult = <T = any>(
  res: Response,
  result: ServiceResult<T>,
  successMessageKey?: MessageKey,
  errorMessageKey?: MessageKey
): Response => {
  if (result.success) {
    const messageKey = result.messageKey || successMessageKey || MESSAGE_KEYS.SUCCESS;
    return ResponseUtil.success(res, result.data, messageKey);
  } else {
    const messageKey = result.messageKey || errorMessageKey || MESSAGE_KEYS.INTERNAL_SERVER_ERROR;

    // Determine status code based on error type
    if (result.error?.includes('already exists') || result.error?.includes('conflict')) {
      return ResponseUtil.conflict(res, messageKey as MessageKey);
    }

    if (result.error?.includes('not found')) {
      return ResponseUtil.notFound(res, messageKey as MessageKey);
    }

    if (result.error?.includes('Invalid') || result.error?.includes('password')) {
      return ResponseUtil.unauthorized(res, messageKey as MessageKey);
    }

    return ResponseUtil.serverError(res, messageKey as MessageKey);
  }
};
