import { UserModel } from '@models';
import { CreateUserDTO, IUser, SignupDTO, LoginDTO, AuthResponse, UsernameCheckResponse, ServiceResult, ServiceSuccess, ServiceError } from '@shared/types';
import { cacheService } from './cache.service';
import { JWTUtil, logger, generateId } from '@utils';
import { MESSAGE_KEYS } from '@shared/constants';
import bcrypt from 'bcrypt';

export class UserService {
  private static instance: UserService;

  private constructor() {}

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * Generate unique user ID
   */
  private generateUserId(): string {
    return generateId(16, 'USER', Date.now().toString());
  }

  /**
   * Create a new user
   */
  public async createUser(data: CreateUserDTO): Promise<ServiceResult<IUser>> {
    try {
      const { username, avatar, preferences } = data;

      // Check if username already exists
      const existingUser = await UserModel.findOne({ username });
      if (existingUser) {
        return new ServiceError(MESSAGE_KEYS.USERNAME_EXISTS, MESSAGE_KEYS.USERNAME_EXISTS);
      }

      const userId = this.generateUserId();

      const newUser = new UserModel({
        id: userId,
        username,
        avatar: avatar || '',
        preferences: {
          soundEnabled: preferences?.soundEnabled ?? true,
          animationsEnabled: preferences?.animationsEnabled ?? true,
          theme: preferences?.theme || 'light',
          difficulty: preferences?.difficulty || 'easy',
        },
      });

      const savedUser = await newUser.save();

      // Cache the user
      const cacheKey = `user:${savedUser.id}`;
      cacheService.set(cacheKey, savedUser.toObject(), 3600);

      return new ServiceSuccess(savedUser.toObject(), MESSAGE_KEYS.USER_CREATED);
    } catch (error: any) {
      logger.error('Error creating user', error);
      return new ServiceError(error.message, MESSAGE_KEYS.FAILED_TO_CREATE_USER);
    }
  }

  /**
   * Get user by ID with caching (read-through pattern)
   */
  public async getUserById(userId: string): Promise<IUser | null> {
    const cacheKey = `user:${userId}`;

    return cacheService.readThrough(
      cacheKey,
      async () => {
        const user = await UserModel.findOne({ id: userId });
        return user ? user.toObject() : null;
      },
      3600
    );
  }

  /**
   * Get user by username with caching
   */
  public async getUserByUsername(username: string): Promise<IUser | null> {
    const cacheKey = `user:username:${username}`;

    return cacheService.readThrough(
      cacheKey,
      async () => {
        const user = await UserModel.findOne({ username });
        return user ? user.toObject() : null;
      },
      3600
    );
  }

  /**
   * Update user last login
   */
  public async updateLastLogin(userId: string): Promise<void> {
    await UserModel.updateOne(
      { id: userId },
      { lastLoginAt: new Date() }
    );

    // Invalidate cache
    const cacheKey = `user:${userId}`;
    cacheService.delete(cacheKey);
  }

  /**
   * Get all users with pagination
   */
  public async getUsers(page: number = 1, limit: number = 10): Promise<{
    users: IUser[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      UserModel.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
      UserModel.countDocuments(),
    ]);

    return {
      users: users.map((user) => user.toObject()),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Signup - Create new user with password
   */
  public async signup(data: SignupDTO): Promise<ServiceResult<AuthResponse>> {
    try {
      const { username, password } = data;

      // Check if username already exists
      const existingUser = await UserModel.findOne({ username });
      if (existingUser) {
        return new ServiceError(MESSAGE_KEYS.USERNAME_EXISTS, MESSAGE_KEYS.USERNAME_EXISTS);
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Generate user ID
      const userId = this.generateUserId();

      // Create user
      const newUser = new UserModel({
        id: userId,
        username,
        password: hashedPassword,
      });

      const savedUser = await newUser.save();

      // Generate JWT token
      const token = JWTUtil.generateToken({
        userId: savedUser.id,
        username: savedUser.username,
      });

      // Cache the user (without password)
      const userObject = savedUser.toObject();
      delete (userObject as any).password;
      const cacheKey = `user:${savedUser.id}`;
      cacheService.set(cacheKey, userObject, 3600);

      const response: AuthResponse = {
        token,
        user: userObject,
      };

      return new ServiceSuccess(response, MESSAGE_KEYS.USER_REGISTERED);
    } catch (error: any) {
      logger.error('Error in signup service', error);
      return new ServiceError(MESSAGE_KEYS.SIGNUP_FAILED, MESSAGE_KEYS.SIGNUP_FAILED);
    }
  }

  /**
   * Login - Authenticate user
   */
  public async login(data: LoginDTO): Promise<ServiceResult<AuthResponse>> {
    try {
      const { username, password } = data;

      // Find user with password field
      const user = await UserModel.findOne({ username }).select('+password');
      if (!user || !user.password) {
        return new ServiceError(MESSAGE_KEYS.INVALID_CREDENTIALS, MESSAGE_KEYS.INVALID_CREDENTIALS);
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return new ServiceError(MESSAGE_KEYS.INVALID_CREDENTIALS, MESSAGE_KEYS.INVALID_CREDENTIALS);
      }

      // Update last login
      await this.updateLastLogin(user.id);

      // Generate JWT token
      const token = JWTUtil.generateToken({
        userId: user.id,
        username: user.username,
      });

      // Get user object without password
      const userObject = user.toObject();
      delete (userObject as any).password;

      // Cache the user
      const cacheKey = `user:${user.id}`;
      cacheService.set(cacheKey, userObject, 3600);

      const response: AuthResponse = {
        token,
        user: userObject,
      };

      return new ServiceSuccess(response, MESSAGE_KEYS.LOGIN_SUCCESS);
    } catch (error: any) {
      logger.error('Error in login service', error);
      return new ServiceError(MESSAGE_KEYS.LOGIN_FAILED, MESSAGE_KEYS.LOGIN_FAILED);
    }
  }

  /**
   * Check if username is available
   * Uses caching for fast lookups
   */
  public async checkUsername(username: string): Promise<ServiceResult<UsernameCheckResponse>> {
    try {
      const cacheKey = `username:check:${username.toLowerCase()}`;

      // Try to get from cache first
      const cachedResult = cacheService.get<UsernameCheckResponse>(cacheKey);
      if (cachedResult !== undefined) {
        return new ServiceSuccess(cachedResult);
      }

      // Check database
      const existingUser = await UserModel.findOne({ username }).select('_id');
      const available = !existingUser;

      const result: UsernameCheckResponse = {
        available,
        username,
      };

      // Cache result for 5 minutes
      cacheService.set(cacheKey, result, 300);

      return new ServiceSuccess(result);
    } catch (error: any) {
      logger.error('Error checking username', error);
      return new ServiceError(MESSAGE_KEYS.USERNAME_CHECK_FAILED, MESSAGE_KEYS.USERNAME_CHECK_FAILED);
    }
  }

  /**
   * Get public user info by username
   * Returns only: username, avatar, stats, level
   */
  public async getPublicUserInfo(username: string): Promise<ServiceResult<{
    username: string;
    avatar: string;
    stats: IUser['stats'];
    level: number;
  }>> {
    try {
      const cacheKey = `user:public:${username.toLowerCase()}`;

      // Try cache first
      const cachedResult = cacheService.get<any>(cacheKey);
      if (cachedResult !== undefined) {
        return new ServiceSuccess(cachedResult);
      }

      // Fetch from database with only required fields
      const user = await UserModel.findOne({ username })
        .select('username avatar stats level')
        .lean();

      if (!user) {
        return new ServiceError(MESSAGE_KEYS.USER_NOT_FOUND, MESSAGE_KEYS.USER_NOT_FOUND);
      }

      const publicInfo = {
        username: user.username,
        avatar: user.avatar || '',
        stats: user.stats,
        level: user.level,
      };

      // Cache for 10 minutes
      cacheService.set(cacheKey, publicInfo, 600);

      return new ServiceSuccess(publicInfo);
    } catch (error: any) {
      logger.error('Error getting public user info', error);
      return new ServiceError(MESSAGE_KEYS.FAILED_TO_GET_USER, MESSAGE_KEYS.FAILED_TO_GET_USER);
    }
  }
}

export const userService = UserService.getInstance();
