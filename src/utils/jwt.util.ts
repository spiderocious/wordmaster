import jwt, { SignOptions } from 'jsonwebtoken';
import { jwtConfig } from '@configs';

export class JWTUtil {
  /**
   * Generate JWT token
   */
  public static generateToken(payload: { userId: string; username: string }): string {
    return jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn as string,
    } as SignOptions);
  }

  /**
   * Verify JWT token
   */
  public static verifyToken(token: string): { userId: string; username: string } | null {
    try {
      const decoded = jwt.verify(token, jwtConfig.secret) as {
        userId: string;
        username: string;
      };
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Decode JWT token without verification
   */
  public static decodeToken(token: string): any {
    return jwt.decode(token);
  }
}
