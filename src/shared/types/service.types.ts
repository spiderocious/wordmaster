import { MessageKey } from '@shared/constants';

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  messageKey?: MessageKey;
}

export class ServiceSuccess<T = any> implements ServiceResult<T> {
  success = true;
  data?: T;
  messageKey?: MessageKey;

  constructor(data?: T, messageKey?: MessageKey) {
    this.data = data;
    this.messageKey = messageKey;
  }
}

export class ServiceError implements ServiceResult {
  success = false;
  error: string;
  messageKey?: MessageKey;

  constructor(error: string, messageKey?: MessageKey) {
    this.error = error;
    this.messageKey = messageKey;
  }
}
