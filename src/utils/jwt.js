//
// PURPOSE:
// Centralized JWT utility helpers for signing and verifying tokens.
//
// DESIGN PRINCIPLES:
// - Keep this file stateless and infrastructure-focused
// - Do not put database logic here
// - Do not put Express request/response logic here
// - Keep payloads minimal and token-specific
//
// TOKEN STRATEGY:
// - Access Token: short-lived, contains only userId
// - Refresh Token: longer-lived, contains userId + tokenId
// - Separate secrets for access and refresh tokens

import jwt from 'jsonwebtoken';
import config from '../config/env.js';

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

/**
 * Generates a short-lived access token.
 *
 * Payload contains only the authenticated user's identifier.
 * Keep access tokens minimal because they are sent frequently.
 */
export function generateAccessToken(userId) {
  return jwt.sign(
    { userId },
    config.JWT_ACCESS_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    }
  );
}

/**
 * Generates a long-lived refresh token.
 *
 * Payload includes:
 * - userId: identifies the token owner
 * - tokenId: identifies the exact refresh-token session record
 *
 * tokenId is essential for token rotation, revocation,
 * multi-device session tracking, and replay detection.
 */
export function generateRefreshToken({ userId, tokenId }) {
  return jwt.sign(
    { userId, tokenId },
    config.JWT_REFRESH_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    }
  );
}

/**
 * Verifies an access token and returns the decoded payload.
 *
 * This function only verifies cryptographic validity and expiry.
 * Authorization/business checks belong elsewhere.
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, config.JWT_ACCESS_SECRET);
}

/**
 * Verifies a refresh token and returns the decoded payload.
 *
 * This confirms signature + expiry only.
 * The caller must still:
 * - load the RefreshToken document by tokenId
 * - compare the raw token against tokenHash
 * - check isRevoked
 * - check expiresAt
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, config.JWT_REFRESH_SECRET);
}