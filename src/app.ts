import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimiter } from '@middlewares';
import routes from '@routes';
import { logger, ResponseUtil } from '@utils';
import { MESSAGE_KEYS } from '@shared/constants';

export class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors());

    // Body parsing middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Rate limiting
    this.app.use(rateLimiter);

    // Request logging in development
    if (process.env.NODE_ENV === 'development') {
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        logger.debug(`${req.method} ${req.path}`);
        next();
      });
    }
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use('/api', routes);

    // Root route
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        success: true,
        message: 'AlphaGame API',
        version: '1.0.0',
      });
    });

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      const lang = ResponseUtil.extractLanguage(req);
      ResponseUtil.setLanguage(lang);
      ResponseUtil.notFound(res, MESSAGE_KEYS.NOT_FOUND);
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(
      (error: Error, req: Request, res: Response, next: NextFunction) => {
        logger.error('Unhandled error', error);

        const lang = ResponseUtil.extractLanguage(req);
        ResponseUtil.setLanguage(lang);

        ResponseUtil.serverError(res, MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
      }
    );
  }

  public getApp(): Application {
    return this.app;
  }
}
