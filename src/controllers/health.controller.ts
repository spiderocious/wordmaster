import { Request, Response } from 'express';
import { database, asyncHandler, ResponseUtil, logger } from '@utils';
import { cacheService } from '@services';
import { MESSAGE_KEYS } from '@shared/constants';

export class HealthController {
  /**
   * Health check endpoint
   */
  public checkHealth = asyncHandler(async (req: Request, res: Response) => {
    const dbStatus = database.getConnectionStatus();
    const cacheStats = cacheService.getStats();

    if (!dbStatus) {
      logger.error('Health check failed: Database not connected');
      return ResponseUtil.error(res, MESSAGE_KEYS.INTERNAL_SERVER_ERROR, 503);
    }

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        connected: dbStatus,
      },
      cache: {
        keys: cacheStats.keys,
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRate: cacheStats.hits / (cacheStats.hits + cacheStats.misses) || 0,
      },
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
      },
    };

    return ResponseUtil.success(res, health);
  });
}

export const healthController = new HealthController();
