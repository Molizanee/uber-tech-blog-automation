import puppeteer, { Browser, Page } from 'puppeteer';
import { browserConfig } from '@/config/browser.config';
import { logger } from '@/utils/logger';

export class BrowserManager {
  private static instance: Browser;

  static async getInstance(): Promise<Browser> {
    if (!this.instance) {
      try {
        this.instance = await puppeteer.launch(browserConfig);
        logger.info('Browser instance created');
      } catch (error) {
        logger.error('Failed to create browser instance', error);
        throw error;
      }
    }
    return this.instance;
  }

  static async createPage(): Promise<Page> {
    const browser = await this.getInstance();
    const page = await browser.newPage();
    await page.setViewport({
      width: 1280,
      height: 720
    });
    return page;
  }

  static async closeBrowser(): Promise<void> {
    if (this.instance) {
      await this.instance.close();
      logger.info('Browser instance closed');
    }
  }
}