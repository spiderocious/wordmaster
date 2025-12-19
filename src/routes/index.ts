import { Router } from 'express';
import userRoutes from './user.routes';
import healthRoutes from './health.routes';
import gameRoutes from './game.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/users', userRoutes);
router.use('/game', gameRoutes);

export default router;
