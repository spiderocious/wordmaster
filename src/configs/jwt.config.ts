import dotenv from 'dotenv';

dotenv.config();

export const jwtConfig = {
  secret: (process.env.JWT_SECRET || 'fallback-secret-key') as string,
  expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string | number,
};
