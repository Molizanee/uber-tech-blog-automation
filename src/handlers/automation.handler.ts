import { BrowserManager } from '@/core/browser';
import { logger } from '@/utils/logger';
import { env } from '@/config/environment.config';
import { Page } from 'puppeteer';

export async function automationHandler() {
  try {
    logger.info('Starting automation process');
    const page = await BrowserManager.createPage();
    
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);
    
    const data = await runAutomation(page);
    await page.close();
    
    logger.info('Automation completed successfully');
    return { status: 'success', message: 'Automation completed', data };
  } catch (error) {
    logger.error('Automation failed', { error });    
    await BrowserManager.closeBrowser();
    return new Response('Automation failed', { status: 500 });
  }
}

interface PostData {
  title: string;  // Main post title
  content: {
    title: string;    // Subtitle of each section
    content: string;  // Content under each subtitle
  }[];
}

async function runAutomation(page: Page) {
  const data: PostData[] = [];
  const MAX_POSTS = 3; // Limit to first 3 posts

  try {
    logger.info('Navigating to target URL', { url: env.TARGET_URL });
    
    await page.goto(env.TARGET_URL, {
      waitUntil: ['domcontentloaded', 'networkidle0'],
      timeout: 60000
    });

    const posts = await getPostsCssElementsIds(page);
    const limitedPosts = posts.slice(0, MAX_POSTS);
    logger.info(`Processing first ${MAX_POSTS} posts out of ${posts.length} total posts`);

    for (const postSelector of limitedPosts) {
      try {
        // Click on post card and navigate to post page
        await clickWithRetry(page, postSelector);
        await waitForContent(page);
        
        // Get data from the post page
        const postData = await Promise.race([
          getPostData(page),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('getData timeout')), 30000)
          )
        ]) as PostData;
        
        data.push(postData);
        logger.info(`Processed post ${data.length} of ${MAX_POSTS}`);

        if (env.SAVE_SCREENSHOTS && postData.title) {
          const screenshotPath = `${env.SCREENSHOT_PATH}/uber-blog-${postData.title.toLowerCase().replace(/\s+/g, '-')}.png`;
          await page.screenshot({ 
            path: screenshotPath,
            fullPage: false
          });
          logger.info('Screenshot saved', { path: screenshotPath });
        }

        // Navigate back to homepage
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
          page.goBack()
        ]);

      } catch (error) {
        logger.error(`Error processing post ${data.length + 1} of ${MAX_POSTS}: ${error}`);
        try {
          await page.goto(env.TARGET_URL, { waitUntil: 'domcontentloaded' });
        } catch (navError) {
          logger.error('Failed to recover navigation', { navError });
        }
        continue;
      }
    }

    return data;
  } catch (error) {
    logger.error(`Error in automation sequence: ${error}`);
    throw error;
  }
}

async function clickWithRetry(page: Page, selector: string, maxRetries = 3): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await page.waitForSelector(selector, { visible: true, timeout: 5000 });
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
        page.click(selector)
      ]);
      return;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

async function waitForContent(page: Page): Promise<void> {
  await Promise.race([
    Promise.all([
      page.waitForSelector('h1', { visible: true }),
      page.waitForSelector('h2, h3', { visible: true })  // Wait for section headers
    ]),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Content timeout')), 10000))
  ]);
}

async function getPostsCssElementsIds(page: Page): Promise<string[]> {
  return await Promise.race([
    page.evaluate(() => {    
      const elements: string[] = [];
      const parentDiv = document.querySelector('div.i1');
      
      if (parentDiv) {      
        const d4Divs = parentDiv.querySelectorAll('div.d4');            
        return Array.from(d4Divs).map((_, index) => (                
          `.d4:nth-child(${index + 1}) > .dh`
        ));
      }
      
      return elements;
    }),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('getPostsCssElementsIds timeout')), 10000)
    )
  ]) as string[];
}

async function getPostData(page: Page): Promise<PostData> {
  return await page.evaluate(() => {
    // Get the main title (h1)
    const mainTitle = document.querySelector('h1')?.textContent?.trim() || '';
    
    // Initialize array to store sections
    const sections: { title: string; content: string; }[] = [];
    
    // Get the content container that has all the sections
    const contentContainer = document.querySelector('article') || document.body;
    
    // Find all headers that are section titles (h2, h3)
    const sectionHeaders = contentContainer.querySelectorAll('h2, h3');
    
    sectionHeaders.forEach((header) => {
      const sectionTitle = header.textContent?.trim() || '';
      let sectionContent = '';
      let currentElement = header.nextElementSibling;
      
      // Collect content until we hit the next section header or run out of siblings
      while (currentElement && !currentElement.matches('h1, h2, h3')) {
        // Skip images and their captions
        if (!currentElement.matches('img, figure')) {
          const text = currentElement.textContent?.trim();
          if (text) {
            // Add space only if there's already content
            if (sectionContent) {
              sectionContent += ' ';
            }
            sectionContent += text;
          }
        }
        currentElement = currentElement.nextElementSibling;
      }
      
      // Only add sections that have both title and content
      if (sectionTitle && sectionContent) {
        sections.push({
          title: sectionTitle,
          content: sectionContent
        });
      }
    });
    
    return {
      title: mainTitle,
      content: sections
    };
  });
}