import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { globalLimiter, authLimiter } from './middleware/rateLimiter.js';
import { authMiddleware } from './middleware/auth.js';
import generateRoutes from './routes/generate.js';
import projectRoutes from './routes/projects.js';
import authRoutes from './routes/auth.js';
import templateRoutes from './routes/templates.js'; // G-01
// NOTE: models.js uses Firestore (via firestore.js). SQLite/initDatabase removed.
// Ensure FIREBASE_SERVICE_ACCOUNT is set in .env for production.

// Load environment variables
dotenv.config();

// L-06: Sentry error tracking — init only if SENTRY_DSN is configured.
// Install: npm install @sentry/node (optional — server starts fine without it)
let Sentry = null;
if (process.env.SENTRY_DSN) {
  try {
    const sentryModule = await import('@sentry/node');
    Sentry = sentryModule.default || sentryModule;
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    });
    console.log('✅ Sentry initialized');
  } catch (e) {
    console.warn('⚠ Sentry not available (@sentry/node not installed):', e.message);
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

// ─── CRITICAL SECURITY CHECKS ──────────────────────────
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is not set.');
  console.error('   Set it in your .env file before starting the server.');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
  console.error('❌ FATAL: CORS_ORIGIN must be set in production.');
  process.exit(1);
}

// ─── PROXY TRUST (required for Render / Railway / Heroku) ──
// Without this, rate limiter sees 127.0.0.1 instead of real client IP
app.set('trust proxy', 1);

// ─── SECURITY MIDDLEWARE ────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "cdn.jsdelivr.net",
        "cdnjs.cloudflare.com",
        "accounts.google.com",       // Google Sign-In SDK
        "apis.google.com",
      ],
      // M-06: 'unsafe-inline' removed — styles use the design-system CSS bundle only.
      // If inline styles are still needed, migrate individual instances to CSS classes,
      // or generate a per-request nonce via helmet's generateNonces feature.
      styleSrc: ["'self'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com", "fonts.googleapis.com", "data:"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'",
        "https://api.openai.com",
        "https://api.anthropic.com",
        "https://api.groq.com",
        "https://api.mistral.ai",
        "https://generativelanguage.googleapis.com",
        "https://api.github.com",
        "https://gist.githubusercontent.com",
        "https://o0.ingest.sentry.io",   // Sentry (only if real DSN configured)
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration
// M-10: Requests with no Origin (curl, server-to-server) are allowed for GET in dev.
// In production, mutating endpoints (POST/PUT/DELETE) additionally require an Origin.
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:5173'];
const isProd = process.env.NODE_ENV === 'production';

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin for GET (health, curl debugging)
    if (!origin) {
      // M-10: In production, flag no-origin requests for rate limiting but allow through.
      // Mutating methods are additionally protected by requireAuth + HMAC.
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Timestamp', 'X-Signature'],
}));

// M-10: Additional guard — block no-origin POST/PUT/DELETE in production
if (isProd) {
  app.use((req, res, next) => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && !req.headers.origin) {
      return res.status(403).json({ error: 'Origin header required for mutating requests' });
    }
    next();
  });
}

// Body parsing
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf.toString('utf8');
  },
}));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ─── MIDDLEWARE ─────────────────────────────────────────
// L-06: Request-ID middleware — stamps every request for log correlation
app.use((req, _res, next) => {
  req.requestId = crypto.randomUUID();
  next();
});
app.use(globalLimiter);
app.use(authMiddleware);

// ─── HEALTH CHECK ───────────────────────────────────────
app.get('/health', async (req, res) => {
  let dbStatus = 'unknown';
  try {
    const { db } = await import('./db/firestore.js');
    await db.collection('_health').limit(1).get();
    dbStatus = 'ok';
  } catch (err) {
    dbStatus = 'error';
  }

  // G-07: Check required API key availability based on KEY_MODE
  const keyMode = String(process.env.KEY_MODE || 'hybrid').toLowerCase();
  const apiKeyStatus = {};
  if (keyMode === 'env' || keyMode === 'hybrid') {
    apiKeyStatus.gemini = !!process.env.GEMINI_API_KEY;
    apiKeyStatus.openai = !!process.env.OPENAI_API_KEY;
    apiKeyStatus.anthropic = !!process.env.ANTHROPIC_API_KEY;
    apiKeyStatus.mistral = !!process.env.MISTRAL_API_KEY;
    apiKeyStatus.groq = !!process.env.GROQ_API_KEY;
  }

  const status = dbStatus === 'ok' ? 'ok' : 'degraded';
  res.status(status === 'ok' ? 200 : 503).json({
    status,
    db: dbStatus,
    keyMode,
    apiKeys: keyMode !== 'byok' ? apiKeyStatus : 'byok-only',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
  });
});

// ─── API ROUTES ─────────────────────────────────────────
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/generate', generateRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/templates', templateRoutes); // G-01

// ─── 404 HANDLER ────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── ERROR HANDLER ──────────────────────────────────────
app.use((err, req, res, _next) => {
  // Don't leak internal error details in production
  const isDev = process.env.NODE_ENV !== 'production';
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: isDev ? (err.message || 'Internal server error') : 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
});

// ─── SERVER STARTUP ────────────────────────────────────
async function start() {
  try {
    // Verify Firestore connection on startup
    const { db } = await import('./db/firestore.js');
    await db.collection('_health').limit(1).get();
    console.log('✅ Firestore connected');

    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║   🚀 AgentSpark Backend Server         ║
║      Running on port ${String(PORT).padEnd(17)}║
║                                        ║
║   Env:  ${(process.env.NODE_ENV || 'development').padEnd(31)}║
║   DB:   Firestore (Firebase Admin)     ║
╚════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// ─── GRACEFUL SHUTDOWN ────────────────────────────────
process.on('SIGINT', async () => {
  console.log('\n✓ Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n✓ Shutting down gracefully...');
  process.exit(0);
});

start();
