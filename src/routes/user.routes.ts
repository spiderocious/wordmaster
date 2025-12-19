import { Router } from 'express';
import { userController } from '@controllers';
import {
  signupValidation,
  loginValidation,
  usernameCheckValidation,
  validateRequest
} from '@requests';

const router = Router();

// Auth endpoints
router.post(
  '/signup',
  signupValidation,
  validateRequest,
  userController.signup.bind(userController)
);

router.post(
  '/login',
  loginValidation,
  validateRequest,
  userController.login.bind(userController)
);

router.post(
  '/username-check',
  usernameCheckValidation,
  validateRequest,
  userController.checkUsername.bind(userController)
);

// Public endpoint - get user info by username
router.get('/user/:username', userController.getUserByUsername.bind(userController));

export default router;
