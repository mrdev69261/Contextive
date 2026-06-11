// src/utils/apiResponse.js
//
// PURPOSE: Enforces a consistent JSON response shape across all endpoints.
//
// WHY THIS MATTERS: Without a shared formatter, different controllers invent
// their own shapes. Frontend developers have to handle 10 different formats.
// Debugging becomes harder. This makes every response predictable.
//
// RESPONSE SHAPE:
//   Success: { success: true,  data: {...},  message: '...' }
//   Error:   { success: false, error: {...}, message: '...' }
//
// HOW TO USE:
//   return ApiResponse.success(res, { workflow }, 'Workflow created', 201);
//   return ApiResponse.error(res, 'Not found', 404, 'NOT_FOUND');
//
// HOW TO EXTEND: Add pagination metadata, API versioning fields, or
// request tracing IDs by modifying the shape here — all endpoints update.

export class ApiResponse {
  // ─── Success Response ──────────────────────────────────────────────────────
  // data:    the actual payload the client needs
  // message: human-readable confirmation string
  // status:  HTTP status code (default 200)

  static success(res, data = null, message = 'Success', status = 200) {
    return res.status(status).json({
      success: true,
      message,
      data,
    });
  }

  // ─── Created Response ─────────────────────────────────────────────────────
  // Shorthand for POST operations that create a resource.

  static created(res, data, message = 'Resource created') {
    return ApiResponse.success(res, data, message, 201);
  }

  // ─── Error Response ───────────────────────────────────────────────────────
  // Primarily used by the error handler middleware, not controllers directly.
  // Controllers should throw errors — not call this manually.

  static error(res, message = 'An error occurred', status = 500, errorCode = 'INTERNAL_ERROR') {
    return res.status(status).json({
      success: false,
      message,
      error: {
        code: errorCode,
        status,
      },
    });
  }
}