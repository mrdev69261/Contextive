// src/errors/errorTypes.js
//
// PURPOSE: Named, typed error classes for every expected failure category.
//
// WHY TYPED ERRORS: Services throw specific errors with clear intent.
//   throw new NotFoundError('Workflow not found')
//   throw new ForbiddenError('Insufficient permissions')
//
// This is cleaner than passing status codes around manually and makes
// the error handler trivial — it just reads the statusCode property.
//
// HOW TO EXTEND: Add a new class below when a new error category is needed.
// Keep error messages user-facing and clear — avoid technical jargon.
// Use errorCode strings that the frontend can switch on for localization.

import { AppError } from './AppError.js';

// ─── 400 Bad Request ──────────────────────────────────────────────────────────
// Use when: the request shape or data is invalid (beyond express-validator).
// Example: stage transition that violates state machine rules.

export class ValidationError extends AppError {
  constructor(message = 'Invalid request data', errorCode = 'VALIDATION_ERROR') {
    super(message, 400, errorCode);
  }
}

// ─── 401 Unauthorized ─────────────────────────────────────────────────────────
// Use when: no valid authentication credentials were provided.
// Never use for permission issues — that's 403.

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', errorCode = 'AUTHENTICATION_REQUIRED') {
    super(message, 401, errorCode);
  }
}

// ─── 403 Forbidden ────────────────────────────────────────────────────────────
// Use when: the user is authenticated but lacks permission for this action.

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action', errorCode = 'FORBIDDEN') {
    super(message, 403, errorCode);
  }
}

// ─── 404 Not Found ────────────────────────────────────────────────────────────
// Use when: a requested resource does not exist or is not visible to this user.
// SECURITY NOTE: For sensitive resources, returning 404 instead of 403 is
// intentional — it avoids confirming that a resource exists to unauthorized users.

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', errorCode = 'NOT_FOUND') {
    super(message, 404, errorCode);
  }
}

// ─── 409 Conflict ─────────────────────────────────────────────────────────────
// Use when: the request conflicts with current state.
// Example: duplicate workspace name, decision already recorded for this stage.

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', errorCode = 'CONFLICT') {
    super(message, 409, errorCode);
  }
}