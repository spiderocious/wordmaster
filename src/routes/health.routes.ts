import { Router } from 'express';
import { healthController } from '@controllers';

const router = Router();

router.get('/', healthController.checkHealth.bind(healthController));

export default router;
