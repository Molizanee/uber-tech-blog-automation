import { Elysia } from 'elysia';
import { logger } from '@/utils/logger';

export const loggerMiddleware = (app: Elysia) => {
  return app.onRequest(({ request }) => {
    logger.info(`${request.method} ${request.url}`);
  });
};