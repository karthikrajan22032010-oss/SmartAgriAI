// ============================================================
// EXPRESS APPLICATION — middleware + routes
// ============================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { config } from './config';
import routes from './routes';
import { logger } from './utils/logger';

const app = express();

app.use(cookieParser());

// ── Security headers ─────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow images
}));

// ── CORS configuration ───────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (config.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    logger.warn(`CORS blocked: ${origin}`);
    return callback(new Error(`CORS: ${origin} not allowed`), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── HTTP request logging ─────────────────────────────────
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// ── Body parsing ─────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting ─────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,            // 120 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests — slow down' },
});
app.use('/api', limiter);

// ── API Routes ────────────────────────────────────────────
app.use('/api', routes);

// ── 404 Handler ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    path: req.path,
  });
});

// ── Global Error Handler ──────────────────────────────────
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : 'Something went wrong',
  });
});

export default app;
