import path from 'node:path';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Router, type Response } from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { cartRouter } from './modules/cart/cart.routes.js';
import { categoryRouter } from './modules/categories/category.routes.js';
import { contentRouter } from './modules/content/content.routes.js';
import { couponRouter } from './modules/coupons/coupon.routes.js';
import { orderRouter } from './modules/orders/order.routes.js';
import { productRouter } from './modules/products/product.routes.js';
import { reviewRouter } from './modules/reviews/review.routes.js';
import { uploadRouter } from './modules/uploads/upload.routes.js';
import { userRouter } from './modules/users/user.routes.js';

export function createApp() {
  const app = express();

  // One reverse proxy (nginx) sits in front in production; needed for correct client IPs.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.CLIENT_ORIGINS, credentials: true }));
  app.use(compression());
  app.use(pinoHttp({ logger, autoLogging: env.NODE_ENV === 'production' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    const up = mongoose.connection.readyState === 1;
    res.status(up ? 200 : 503).json({ status: up ? 'ok' : 'unavailable' });
  });

  const staticFiles = {
    maxAge: '7d',
    setHeaders: (res: Response, filePath: string) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
      if (/\.(docx|xlsx)$/i.test(filePath)) res.setHeader('Content-Disposition', 'attachment');
    },
  };
  const uploadDir = path.resolve(env.UPLOAD_DIR);
  app.use('/uploads', express.static(uploadDir, staticFiles));
  // Files uploaded before the folder structure existed keep their original addresses.
  app.use('/uploads', express.static(path.join(uploadDir, 'legacy'), staticFiles));

  const api = Router();
  api.use(apiLimiter);
  api.use('/auth', authRouter);
  api.use('/users', userRouter);
  api.use('/categories', categoryRouter);
  api.use('/products', productRouter);
  api.use('/reviews', reviewRouter);
  api.use('/cart', cartRouter);
  api.use('/orders', orderRouter);
  api.use('/coupons', couponRouter);
  api.use('/content', contentRouter);
  api.use('/uploads', uploadRouter);
  api.use('/admin', adminRouter);
  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
