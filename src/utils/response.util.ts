import { Response } from 'express';
import { HTTP_STATUS, getMessage, MessageKey, Language, MESSAGE_KEYS, SUPPORTED_LANGUAGES } from '@shared/constants';
import { ApiResponse } from '@shared/types';

export class ResponseUtil {
  private static currentLanguage: Language = SUPPORTED_LANGUAGES.ENGLISH;

  /**
   * Set current language for this request context
   */
  static setLanguage(lang: Language): void {
    ResponseUtil.currentLanguage = lang;
  }

  /**
   * Get current language
   */
  private static getLang(): Language {
    return ResponseUtil.currentLanguage;
  }

  /**
   * Extract language from request
   */
  static extractLanguage(req: any): Language {
    const lang = req?.query?.lang || req?.body?.lang || req.headers['accept-language'];

    const supportedLangs = Object.values(SUPPORTED_LANGUAGES);
    if (lang && supportedLangs.includes(lang.toLowerCase())) {
      return lang.toLowerCase() as Language;
    }

    return SUPPORTED_LANGUAGES.ENGLISH;
  }

  /**
   * Send success response
   */
  static success<T = any>(
    res: Response,
    data?: T,
    messageKey?: MessageKey,
    statusCode: number = HTTP_STATUS.OK
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      ...(messageKey && { message: getMessage(messageKey, ResponseUtil.getLang()) }),
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send created response (201)
   */
  static created<T = any>(
    res: Response,
    data?: T,
    messageKey: MessageKey = MESSAGE_KEYS.RESOURCE_CREATED
  ): Response {
    return ResponseUtil.success(res, data, messageKey, HTTP_STATUS.CREATED);
  }

  /**
   * Send error response
   */
  static error(
    res: Response,
    messageKey: MessageKey,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    details?: any
  ): Response {
    const response: ApiResponse = {
      success: false,
      error: getMessage(messageKey, ResponseUtil.getLang()),
      ...(details && { details }),
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send bad request response (400)
   */
  static badRequest(
    res: Response,
    messageKey: MessageKey = MESSAGE_KEYS.BAD_REQUEST,
    details?: any
  ): Response {
    return ResponseUtil.error(res, messageKey, HTTP_STATUS.BAD_REQUEST, details);
  }

  /**
   * Send validation error response (400)
   */
  static validationError(
    res: Response,
    details: any,
    messageKey: MessageKey = MESSAGE_KEYS.VALIDATION_FAILED
  ): Response {
    return ResponseUtil.badRequest(res, messageKey, details);
  }

  /**
   * Send unauthorized response (401)
   */
  static unauthorized(
    res: Response,
    messageKey: MessageKey = MESSAGE_KEYS.UNAUTHORIZED
  ): Response {
    return ResponseUtil.error(res, messageKey, HTTP_STATUS.UNAUTHORIZED);
  }

  /**
   * Send forbidden response (403)
   */
  static forbidden(
    res: Response,
    messageKey: MessageKey = MESSAGE_KEYS.FORBIDDEN
  ): Response {
    return ResponseUtil.error(res, messageKey, HTTP_STATUS.FORBIDDEN);
  }

  /**
   * Send not found response (404)
   */
  static notFound(
    res: Response,
    messageKey: MessageKey = MESSAGE_KEYS.NOT_FOUND
  ): Response {
    return ResponseUtil.error(res, messageKey, HTTP_STATUS.NOT_FOUND);
  }

  /**
   * Send conflict response (409)
   */
  static conflict(
    res: Response,
    messageKey: MessageKey
  ): Response {
    return ResponseUtil.error(res, messageKey, HTTP_STATUS.CONFLICT);
  }

  /**
   * Send internal server error response (500)
   */
  static serverError(
    res: Response,
    messageKey: MessageKey = MESSAGE_KEYS.INTERNAL_SERVER_ERROR
  ): Response {
    return ResponseUtil.error(res, messageKey, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}
