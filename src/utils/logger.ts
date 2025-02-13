import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'warn';
};

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: false }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}`
  )
);

const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports: [
    new winston.transports.Console(),
    new DailyRotateFile({
      dirname: 'logs',
      filename: 'debug-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      level: 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    new DailyRotateFile({
      dirname: 'logs',
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
  ],
  exitOnError: false,
});

interface ExtendedLogger extends winston.Logger {
  logRequest: (req: any, res: any, responseTime: number) => void;
  logError: (error: Error, context?: string) => void;
  logPerformance: (operation: string, timeMs: number) => void;
}

const extendedLogger = logger as ExtendedLogger;

extendedLogger.logRequest = (req, res, responseTime) => {
  logger.http({
    method: req.method,
    url: req.url,
    status: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.headers['user-agent'],
  });
};

extendedLogger.logError = (error: Error, context?: string) => {
  logger.error({
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });
};

extendedLogger.logPerformance = (operation: string, timeMs: number) => {
  logger.info({
    type: 'performance',
    operation,
    timeMs,
    timestamp: new Date().toISOString(),
  });
};

export { extendedLogger as logger };