import { env } from './environment.config';

export const browserConfig = {
  headless: env.HEADLESS,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-accelerated-2d-canvas'
  ],
  defaultViewport: {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
  }
};