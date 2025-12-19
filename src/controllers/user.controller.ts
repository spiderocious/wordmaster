import { Request, Response } from 'express';
import { userService } from '@services';
import { asyncHandler, handleServiceResult } from '@utils';

export class UserController {
  /**
   * Signup - Register a new user
   */
  public signup = asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body;

    const result = await userService.signup({ username, password });

    return handleServiceResult(res, result);
  });

  /**
   * Login - Authenticate user
   */
  public login = asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body;

    const result = await userService.login({ username, password });

    return handleServiceResult(res, result);
  });

  /**
   * Check username availability
   */
  public checkUsername = asyncHandler(async (req: Request, res: Response) => {
    const { username } = req.body;

    const result = await userService.checkUsername(username);

    return handleServiceResult(res, result);
  });

  /**
   * Get public user info by username
   */
  public getUserByUsername = asyncHandler(async (req: Request, res: Response) => {
    const { username } = req.params;

    const result = await userService.getPublicUserInfo(username);

    return handleServiceResult(res, result);
  });
}

export const userController = new UserController();
