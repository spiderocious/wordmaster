import dotenv from 'dotenv';

dotenv.config();

export const cacheConfig = {
  stdTTL: parseInt(process.env.CACHE_TTL || '3600', 10),
  checkperiod: parseInt(process.env.CACHE_CHECK_PERIOD || '600', 10),
  useClones: false,
  deleteOnExpire: true,
};
