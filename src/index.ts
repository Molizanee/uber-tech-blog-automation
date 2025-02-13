import { Elysia } from 'elysia';
import { automationHandler } from '@/handlers/automation.handler';
import { env } from '@/config/environment.config';
import { BrowserManager } from '@/core/browser';
import { loggerMiddleware } from '@/middleware/logger.middleware';
import { logger } from '@/utils/logger';

const app = new Elysia({
  serve: {    
    idleTimeout: 0
  }
})
  .use(loggerMiddleware)
  .get('/health', () => ({ status: 'ok' }))
  .post('/api/automation/start', automationHandler)
  .listen(env.PORT);

process.on('SIGTERM', async () => {
  await BrowserManager.closeBrowser();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await BrowserManager.closeBrowser();
  process.exit(0);
});

logger.info(`🚀 Server running at ${app.server?.hostname}:${env.PORT}`);