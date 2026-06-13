// PURPOSE:
// Reusable authentication middleware for protected routes.
//
// RESPONSIBILITIES:
// - Read Authorization header
// - Accept only Bearer access tokens
// - Verify the JWT access token
// - Load the authenticated user
// - Attach the authenticated user to req.user
//
// DOES NOT:
// - Perform role checks
// - Perform permission checks
// - Contain business logic

import User from '../domains/identity/user.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { AuthenticationError } from '../errors/errorTypes.js';

const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.get('Authorization');

  if (!authHeader) {
    throw new AuthenticationError('Authentication required');
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new AuthenticationError('Invalid authorization format');
  }

  let decoded;

  try {
    decoded = verifyAccessToken(token);
  } catch {
    throw new AuthenticationError('Invalid or expired access token');
  }

  const { userId } = decoded;

  if (!userId) {
    throw new AuthenticationError('Invalid access token payload');
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new AuthenticationError('Authentication failed');
  }

  if (user.isActive === false) {
    throw new AuthenticationError('User account is inactive');
  }

  req.user = user;

  next();
});

export default protect;