// src/errors/AppError.js
//
// PURPOSE: Base class for all application errors.
//
// WHY A CUSTOM CLASS: Native Error objects have no HTTP status code or
// structured context. By extending Error, we get stack traces for free
// while adding the fields our error handler needs to respond correctly.
//
// HOW IT WORKS: Every error thrown by a service is an AppError or a subclass.
// The global error handler checks `error instanceof AppError` to distinguish
// our intentional errors from unexpected runtime crashes.
//
// HOW TO EXTEND: Create a subclass in errorTypes.js for each specific error
// category. Never throw raw AppError directly — always throw a typed subclass.

export class AppError extends Error {
  constructor(message, statusCode, errorCode = null) {
    // Call native Error constructor to preserve stack trace behavior
    super(message);

    // HTTP status code this error maps to (4xx = client, 5xx = server)
    this.statusCode = statusCode;

    // Machine-readable code for the client to identify error type
    // e.g. 'WORKSPACE_NOT_FOUND', 'DECISION_IMMUTABLE'
    // Falls back to a generic code derived from the status if not provided.
    this.errorCode = errorCode || `ERROR_${statusCode}`;

    // Marks this as an intentional, operational error — not a programming bug.
    // The error handler uses this to decide whether to expose the message.
    this.isOperational = true;

    // Captures the correct stack trace pointing to where the error was thrown,
    // not to this constructor.
    Error.captureStackTrace(this, this.constructor);
  }
}