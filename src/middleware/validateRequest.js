//
// PURPOSE:
// Reusable middleware that collects express-validator results
// and returns a consistent API response when validation fails.
//
// DESIGN PRINCIPLES:
// - Generic: can be reused by any route after validator chains
// - Boundary-focused: handles request-shape failures only
// - Controller-friendly: stops invalid requests before controllers run

import { validationResult } from 'express-validator';

function validateRequest(req, res, next) {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: errors.array({ onlyFirstError: true }).map((error) => ({
      field: error.path,
      message: error.msg,
    })),
  });
}

export default validateRequest;