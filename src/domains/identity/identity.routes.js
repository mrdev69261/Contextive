// PURPOSE:
// Route definitions for the Identity domain.
//
// RESPONSIBILITIES:
// - Create a domain router
// - Define endpoint paths
// - Compose middleware in the correct order
//
// DOES NOT:
// - Contain business logic
// - Query the database
// - Generate tokens
// - Perform manual validation

import { Router } from 'express';

import { register, login, refresh, logout } from './identity.controller.js';
import { registerValidator, loginValidator, refreshValidator, logoutValidator } from './identity.validator.js';
import validateRequest from '../../middleware/validateRequest.js';

const router = Router();

router.post(
  '/register',
  registerValidator,
  validateRequest,
  register
);

router.post(
  '/login',
  loginValidator,
  validateRequest,
  login
);

router.post(
  '/refresh',
  refreshValidator,
  validateRequest,
  refresh
);

router.post(
  '/logout',
  logoutValidator,
  validateRequest,
  logout
);

export default router;