// src/app.js
require('dotenv').config();
require('express-async-errors');

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');

const env               = require('./config/env');
const errorHandler      = require('./middleware/errorHandler');
const { notFoundError } = require('./utils/errors');

// ── Route imports ─────────────────────────────────────────────────────────────
const authRoutes        = require('./modules/auth/auth.routes');
const inventoryRoutes   = require('./modules/inventory/inventory.routes');
const ledgerRoutes      = require('./modules/ledger/ledger.routes');
const libraryRoutes     = require('./modules/library/library.routes');
const visitorsRoutes    = require('./modules/visitors/visitors.routes');
const incidentsRoutes   = require('./modules/incidents/incidents.routes');
const igfRoutes         = require('./modules/igf/igf.routes');
const classesRoutes     = require('./modules/classes/classes.routes');
const enrollmentRoutes  = require('./modules/enrollment/enrollment.routes');
const achievementsRoutes = require('./modules/achievements/achievements.routes');

const app = express();

app.set('trust proxy', 1);

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  ...(env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean) : []),
  ...(env.CLIENT_URL && env.CLIENT_URL !== '*' ? [env.CLIENT_URL] : []),
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ── Security & logging ────────────────────────────────────────────────────────
app.use(helmet());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate limiters ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  standardHeaders: true, legacyHeaders: false,
  message: { status: 'error', message: 'Too many attempts. Please try again in 15 minutes.' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, max: 300,
  standardHeaders: true, legacyHeaders: false,
  message: { status: 'error', message: 'Too many requests. Please slow down.' },
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', env: env.NODE_ENV, timestamp: new Date().toISOString() })
);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',         authLimiter, authRoutes);
app.use('/api/inventory',    apiLimiter,  inventoryRoutes);
app.use('/api/ledger',       apiLimiter,  ledgerRoutes);
app.use('/api/library',      apiLimiter,  libraryRoutes);
app.use('/api/visitors',     apiLimiter,  visitorsRoutes);
app.use('/api/incidents',    apiLimiter,  incidentsRoutes);
app.use('/api/igf',          apiLimiter,  igfRoutes);
app.use('/api/classes',      apiLimiter,  classesRoutes);
app.use('/api/enrollment',   apiLimiter,  enrollmentRoutes);
app.use('/api/achievements', apiLimiter,  achievementsRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res, next) => next(notFoundError(`Route ${req.originalUrl} not found.`)));

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// Start only when not imported (keeps tests clean)
if (require.main === module) {
  app.listen(env.PORT, () => {
    console.log(`\n🚀 School Record Keeping API running on http://localhost:${env.PORT}`);
    console.log(`   Environment : ${env.NODE_ENV}`);
    console.log(`   Health check: http://localhost:${env.PORT}/api/health\n`);
  });
}

module.exports = app;
