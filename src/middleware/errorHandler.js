// src/middleware/errorHandler.js
//
// PURPOSE: Single middleware that catches all errors thrown anywhere in the app.
//
// HOW EXPRESS ERROR HANDLING WORKS:
// Any middleware or route that calls next(err) — or any async function wrapped
// in asyncHandler that rejects — routes here. Express identifies error-handling
// middleware by its four-argument signature: (err, req, res, next).
//
// WHAT THIS DOES:
// 1. Checks if the error is an intentional AppError or an unexpected crash
// 2. Normalizes Mongoose-specific errors into AppErrors
// 3. In development: returns full stack trace for debugging
// 4. In production: returns only safe, user-facing information
//
// HOW TO EXTEND: Add new Mongoose error types, integrate error monitoring
// (Sentry, Datadog) or structured logging here without touching any service.

import config from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import { ApiResponse } from '../utils/apiResponse.js';

// ─── Mongoose Error Normalizers ───────────────────────────────────────────────
// Mongoose throws its own error types. We convert them to AppErrors so the
// rest of the handler doesn't need to know about Mongoose internals.

const handleMongooseCastError = (err) => {
  // Thrown when an invalid ID format is used in a query
  return new AppError(`Invalid value for field: ${err.path}`, 400, 'INVALID_ID');
};

const handleMongooseDuplicateKey = (err) => {
  // Thrown when a unique index constraint is violated
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  return new AppError(`${field} already exists`, 409, 'DUPLICATE_ENTRY');
};

const handleMongooseValidationError = (err) => {
  // Thrown when Mongoose schema validation fails on save
  const messages = Object.values(err.errors).map((e) => e.message).join('. ');
  return new AppError(messages, 400, 'SCHEMA_VALIDATION_ERROR');
};

const handleJwtError = () =>
  new AppError('Invalid token. Please log in again.', 401, 'INVALID_TOKEN');

const handleJwtExpired = () =>
  new AppError('Your session has expired. Please log in again.', 401, 'TOKEN_EXPIRED');

// ─── Error Handler ────────────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Log every error server-side — always, regardless of environment.
  // In production, replace console.error with a proper logger (Winston, Pino).
  console.error(`[Error] ${err.message}`, {
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    ...(config.isDevelopment && { stack: err.stack }),
  });

  // ── Normalize known external error types ────────────────────────────────
  let error = err;

  if (err.name === 'CastError')              error = handleMongooseCastError(err);
  if (err.code === 11000)                    error = handleMongooseDuplicateKey(err);
  if (err.name === 'ValidationError')        error = handleMongooseValidationError(err);
  if (err.name === 'JsonWebTokenError')      error = handleJwtError();
  if (err.name === 'TokenExpiredError')      error = handleJwtExpired();

  // ── Operational errors: safe to expose to the client ────────────────────
  // isOperational is set by AppError — these are intentional, expected errors.
  if (error.isOperational) {
    return ApiResponse.error(res, error.message, error.statusCode, error.errorCode);
  }

  // ── Non-operational errors: programming bugs or unexpected crashes ───────
  // Never expose internal error details in production.
  if (config.isProduction) {
    return ApiResponse.error(res, 'Something went wrong. Please try again.', 500, 'INTERNAL_ERROR');
  }

  // In development: expose full details for debugging
  return res.status(500).json({
    success: false,
    message: error.message,
    error: {
      code: 'INTERNAL_ERROR',
      status: 500,
      stack: error.stack,
    },
  });
};

export default errorHandler;