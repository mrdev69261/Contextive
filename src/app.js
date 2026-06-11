// src/app.js
//
// PURPOSE: Assembles the Express application.
// This file has one job: wire things together.
//
// WHAT BELONGS HERE:
//   - Global middleware (security headers, cors, body parsing, logging)
//   - Route mounting (API routes from domain modules)
//   - 404 handler (for unmatched routes)
//   - Global error handler (always last)
//
// WHAT DOES NOT BELONG HERE:
//   - Business logic (belongs in services)
//   - Database connection (belongs in server.js startup sequence)
//   - Environment reads (belongs in config/env.js)
//
// HOW TO EXTEND: Mount new domain routers in the API Routes section below.
// Add new global middleware before the routes section.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import config from './config/env.js';
import errorHandler from './middleware/errorHandler.js';
import { NotFoundError } from './errors/errorTypes.js';

const app = express();

// ─── Security Middleware ──────────────────────────────────────────────────────
// helmet() sets ~15 security-related HTTP headers automatically.
// This is a single line that prevents a wide class of common attacks.

app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Only allow requests from our known frontend origins.
// In development this is localhost:3000. In production, your deployed domain.
// Origins are defined in config — not hardcoded here.

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin) return callback(null, true);

    if (config.ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error(`CORS: Origin ${origin} not permitted`));
  },
  credentials: true, // Allow cookies (needed for refresh token cookie later)
}));

// ─── Request Parsing ──────────────────────────────────────────────────────────

app.use(express.json({ limit: '10kb' }));           // Parse JSON bodies, cap size
app.use(express.urlencoded({ extended: true }));     // Parse URL-encoded bodies

// ─── HTTP Request Logging ─────────────────────────────────────────────────────
// morgan 'dev' format logs: METHOD /path STATUS response-time
// Skip in test environments to keep test output clean.

if (config.NODE_ENV !== 'test') {
  app.use(morgan(config.isDevelopment ? 'dev' : 'combined'));
}

// ─── Health Check ─────────────────────────────────────────────────────────────
// Simple ping endpoint for load balancers and uptime monitoring.
// Does not require authentication. Does not touch the database.

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
// Mount domain routers here as they are built.
// All API routes are prefixed with /api/v1 — versioning from day one
// so future breaking changes can be made on /api/v2 without removing /api/v1.
//
// FUTURE: Uncomment these as each domain module is implemented.
//
// import identityRoutes    from './domains/identity/identity.routes.js';
// import workspaceRoutes   from './domains/workspace/workspace.routes.js';
// import workflowRoutes    from './domains/workflow/workflow.routes.js';
// import decisionRoutes    from './domains/decision/decision.routes.js';
//
// app.use('/api/v1/auth',       identityRoutes);
// app.use('/api/v1/workspaces', workspaceRoutes);
// app.use('/api/v1/workflows',  workflowRoutes);
// app.use('/api/v1/decisions',  decisionRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
// Any route not matched above reaches here.
// We throw a NotFoundError so it flows through our error handler
// with a consistent response shape — not Express's default HTML 404.

app.use((req, res, next) => {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// Must be registered LAST. Express identifies this by its 4-argument signature.
// All errors flow here — from routes, middleware, and asyncHandler wrappers.

app.use(errorHandler);

export default app;