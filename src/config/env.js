// src/config/env.js
//
// PURPOSE: Single source of truth for all environment variables.
//
// RULE: No other file in this project reads process.env directly.
// Every file imports from this module instead.
//
// WHY: If a variable is missing or misnamed, the app fails here at startup
// with a clear message — not silently mid-request somewhere unexpected.
//
// HOW TO EXTEND: Add a new required variable to REQUIRED_VARS and export it.
// Add optional variables with a default value directly in the config object.

import dotenv from 'dotenv';
dotenv.config();

// ─── Required Variable Guard ─────────────────────────────────────────────────
// List every variable the app cannot function without.
// If any are missing, the process exits before the server starts.

const REQUIRED_VARS = [
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`\n[Config] Missing required environment variables:\n  ${missing.join('\n  ')}\n`);
  process.exit(1);
}

// ─── Config Object ───────────────────────────────────────────────────────────
// Exported as a frozen object — nothing can mutate config at runtime.
// Optional variables use || to fall back to safe defaults.

const config = Object.freeze({
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,

  // Database
  MONGODB_URI: process.env.MONGODB_URI,

  // JWT — two separate secrets for access and refresh tokens
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // CORS — comma-separated list of allowed origins in env
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000'],

  // AI Provider — added when Intelligence module is built
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || null,

  // Helpers
  isDevelopment: process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production',
});

export default config;