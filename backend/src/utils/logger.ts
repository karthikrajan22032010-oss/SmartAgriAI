// ============================================================
// LOGGER — Winston structured logging
// ============================================================

import winston from 'winston';
import { config } from '../config';

const { combine, timestamp, colorize, printf, json } = winston.format;

const devFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level}]: ${message}${metaStr}`;
});

export const logger = winston.createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    config.nodeEnv === 'production'
      ? json()
      : combine(colorize(), devFormat)
  ),
  transports: [
    new winston.transports.Console(),
  ],
});
