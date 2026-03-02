import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initDatabase, closeDatabase } from './db/init.js';
import { globalLimiter, authLimiter } from './middleware/rateLimiter.js';
import { authMiddleware } from './middleware/auth.js';
import generateRoutes from './routes/generate.js';
import projectRoutes from './routes/projects.js';
import authRoutes from './routes/auth.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'dev_super_secret_jwt_key_change_in_production_immediately';
}

// ─── SECURITY MIDDLEWARE ────────────────────────────────
// Helmet helps secure Express by setting various HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com", "fonts.googleapis.com", "data:"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'",
        "https://api.openai.com",
        "https://api.anthropic.com",
        "https://api.groq.com",
        "https://api.mistral.ai",
        "https://generativelanguage.googleapis.com",
      ],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  },
}));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ─── MIDDLEWARE ─────────────────────────────────────────
// Global rate limiter
app.use(globalLimiter);

// Auth middleware (optional for some routes)
app.use(authMiddleware);

// ─── HEALTH CHECK ───────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API ROUTES ─────────────────────────────────────────
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/generate', generateRoutes);
app.use('/api/v1/projects', projectRoutes);

// ─── 404 HANDLER ────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── ERROR HANDLER ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ─── SERVER STARTUP ────────────────────────────────────
async function start() {
  try {
    // Initialize database
    await initDatabase();

    // Start server
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║   🚀 AgentSpark Backend Server         ║
║      Running on port ${PORT}            ║
║                                        ║
║   Environment: ${process.env.NODE_ENV || 'development'}              ║
║   Database: ${process.env.DATABASE_PATH || 'data/agentspark.db'}     ║
╚════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// ─── GRACEFUL SHUTDOWN ────────────────────────────────
process.on('SIGINT', async () => {
  console.log('\n✓ Shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n✓ Shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

// Start
start();
