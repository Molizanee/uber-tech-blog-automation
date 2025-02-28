# Uber Tech Blog Automation

## Overview

Uber Tech Blog Automation is a web crawler designed to retrieve and process data from Uber's Engineering Blog. This project demonstrates the implementation of modern web automation techniques using Puppeteer, combined with a robust backend server built with Elysia, and containerized with Docker. The system includes comprehensive logging, error handling, and follows good project organization practices.

## Technologies Used

- **Runtime**: [Bun](https://bun.sh/) - A fast all-in-one JavaScript runtime
- **Web Framework**: [Elysia](https://elysiajs.com/) - A high-performance Bun web framework
- **Web Scraping**: [Puppeteer](https://pptr.dev/) - Headless Chrome Node.js API
- **Logging**: [Winston](https://github.com/winstonjs/winston) with Daily Rotate File
- **Containerization**: Docker and Docker Compose
- **Environment Management**: dotenv
- **Type Safety**: TypeScript with Zod for runtime validation

## Project Structure

```
├── src/
│   ├── config/           # Configuration modules
│   │   ├── browser.config.ts
│   │   └── environment.config.ts
│   ├── core/             # Core functionality
│   │   └── browser.ts    # Browser management
│   ├── handlers/         # Request handlers
│   │   └── automation.handler.ts
│   ├── middleware/       # Elysia middleware
│   │   └── logger.middleware.ts
│   ├── utils/            # Utility functions
│   │   ├── health-check.ts
│   │   └── logger.ts
│   └── index.ts          # Application entry point
├── docker-compose.yaml       # Development Docker configuration
├── docker-compose.prod.yaml  # Production Docker configuration
├── Dockerfile                # Docker image definition
├── .env.example              # Example environment variables
├── package.json              # Project dependencies
├── tsconfig.json             # TypeScript configuration
└── README.md                 # Project documentation
```

## Features

- **Automated Blog Post Extraction**: Crawls the Uber Engineering Blog to extract post titles and content
- **Headless Browser Control**: Uses Puppeteer to navigate and interact with the target website
- **Screenshot Capture**: Optionally saves screenshots of blog posts
- **Robust Error Handling**: Implements retry mechanisms and graceful error recovery
- **Comprehensive Logging**: Detailed logging with daily rotation for monitoring and debugging
- **Health Checks**: Built-in health check endpoint for container monitoring
- **Environment Variables Validation**: Runtime validation of environment variables using Zod
- **Development Mode**: Hot reloading during development
- **Production-Ready Setup**: Optimized Docker configuration for production deployment

## API Endpoints

- `GET /health` - Health check endpoint
- `POST /api/automation/start` - Triggers the blog scraping process

### Sample Response

When the automation process completes successfully, it returns a JSON response with the following structure:

```json
{
  "status": "success",
  "message": "Automation completed",
  "data": [
    {
      "title": "Adopting Arm at Scale: Transitioning to a Multi-Architecture Environment",
      "content": [
        {
          "title": "Related articles",
          "content": "Engineering, BackendAdopting Arm at Scale: Bootstrapping Infrastructure13 February / Global..."
        },
        {
          "title": "Most popular",
          "content": "Engineering, Backend13 February / GlobalAdopting Arm at Scale: Bootstrapping Infrastructure..."
        }
      ]
    },
    {
      "title": "MySQL At Uber",
      "content": [
        {
          "title": "Related articles",
          "content": "Engineering, BackendAdopting Arm at Scale: Transitioning to a Multi-Architecture Environment..."
        },
        {
          "title": "Most popular",
          "content": "Engineering, Backend13 February / GlobalAdopting Arm at Scale: Bootstrapping Infrastructure..."
        }
      ]
    }
    // Additional blog posts...
  ]
}
```

## Setup and Installation

### Prerequisites

- Docker and Docker Compose
- Bun (for local development)

### Environment Configuration

1. Create a `.env` file based on the `.env.example` template:
   ```
   NODE_ENV="development"  # development, production
   PORT=3000               # default port
   HEADLESS=true           # true, false
   TARGET_URL="https://www.uber.com/en-IN/blog/engineering/"  # target url
   SAVE_SCREENSHOTS=true   # true, false
   SCREENSHOT_PATH=./screenshots  # path to save screenshots
   ```

### Running with Docker

#### Development Mode with Hot Reload

```bash
docker-compose up --build
```

#### Production Mode

```bash
docker-compose -f docker-compose.prod.yml up --build
```

### Local Development

```bash
# Install dependencies
bun install

# Start development server with hot reload
bun run dev

# Start in production mode
bun start
```

## How It Works

1. The automation process is triggered via the `/api/automation/start` endpoint
2. A headless browser instance is launched using Puppeteer
3. The browser navigates to the Uber Engineering Blog
4. The system identifies blog post links on the main page
5. For each post (limited to 3 by default):
   - Clicks on the post link
   - Extracts the title and content sections
   - Optionally captures a screenshot
   - Returns to the main page
6. The extracted data is returned as a structured JSON response

## Implementation Details

### Browser Management

The `BrowserManager` class implements the Singleton pattern to maintain a single browser instance throughout the application's lifecycle. It provides methods for creating new pages and shutting down the browser cleanly.

```typescript
// Example of how BrowserManager maintains a single instance
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
}
```

### Configuration

Environment variables are validated using Zod to ensure all required parameters are present and correctly formatted. Browser configuration parameters are centralized for easy adjustment.

```typescript
// Example of environment validation with Zod
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'testing', 'staging', 'production'])
    .default('development'),
  PORT: z.string().transform(Number).default('3000'),
  HEADLESS: z.string().transform(val => val === 'true').default('true'),
  TARGET_URL: z.string().url(),
  // ...other environment variables
});
```

### Error Handling

The automation process implements various error handling mechanisms:
- Timeout management with Promise.race
- Retry logic for clicking elements with exponential backoff
- Navigation recovery through fallback mechanisms
- Graceful process termination with signal handlers

```typescript
// Example of retry logic with exponential backoff
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
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### Logging

The application uses Winston for structured logging with:
- Console output during development
- JSON-formatted file logs with daily rotation
- Separate log files for errors and debug information
- Contextual logging with metadata

```typescript
// Example of structured logging with Winston
logger.info('Starting automation process', {
  targetUrl: env.TARGET_URL,
  timestamp: new Date().toISOString(),
  headless: env.HEADLESS
});

logger.error('Automation failed', { 
  error: error.message,
  stack: error.stack,
  context: 'automationHandler' 
});
```

## Docker Configuration

### Development Environment

The development Docker setup includes:
- Volume mounting for hot reloading
- Higher memory limits for development tools
- Source code mounting for real-time changes

### Production Environment

The production configuration:
- Uses optimized build settings
- Implements health checks
- Configures appropriate resource limits
- Enables container restart policies

## Data Model

The automation tool extracts structured data from blog posts with the following format:

```typescript
interface PostData {
  title: string;  // Main post title
  content: {
    title: string;    // Subtitle of each section
    content: string;  // Content under each subtitle
  }[];
}
```

The crawler is designed to identify and extract:
1. The main title of each blog post
2. Section titles within the blog post
3. Content text from each section

While the current implementation focuses on basic text extraction, the modular design allows for easy extension to capture more detailed information such as:
- Author information
- Publication dates
- Images and captions
- Code snippets
- Links and references

## License

[MIT License](https://opensource.org/licenses/MIT)

---

**Note**: This project is for educational purposes only. Always respect website terms of service and robots.txt rules when implementing web scrapers.
