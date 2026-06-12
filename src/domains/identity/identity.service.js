//
// PURPOSE:
// Business logic for Identity domain registration.
//
// WHAT BELONGS HERE:
// - Database-backed business rules
// - User creation orchestration
// - Token generation orchestration
// - Refresh-token session persistence
//
// WHAT DOES NOT BELONG HERE:
// - HTTP request/response handling
// - Cookies
// - Express middleware concerns
// - Model-level persistence transforms like password hashing
//
// IMPORTANT:
// This service assumes the User model already hashes passwords
// in a pre-save hook. Therefore, the raw password is passed into
// User.create(), and the model handles secure persistence.

import crypto from 'crypto';

import User from './user.model.js';
import RefreshToken from './refreshToken.model.js';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt.js';
import { ConflictError, AuthenticationError, } from '../../errors/errorTypes.js';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function registerUser({
  name,
  email,
  password,
  userAgent = null,
  ipAddress = null,
}) {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new ConflictError('Email is already registered');
  }

  const user = await User.create({
    name,
    email,
    password,
  });

  const userId = user._id.toString();
  const tokenId = crypto.randomUUID();

  const accessToken = generateAccessToken(userId);

  const refreshToken = generateRefreshToken({
    userId,
    tokenId,
  });

  const refreshTokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await RefreshToken.create({
    userId: user._id,
    tokenId,
    tokenHash: refreshTokenHash,
    userAgent,
    ipAddress,
    expiresAt,
    isRevoked: false,
  });

  return {
    user: {
      id: userId,
      name: user.name,
      email: user.email,
    },
    tokens: {
      accessToken,
      refreshToken,
    },
  };
}

export async function loginUser({
  email,
  password,
  userAgent = null,
  ipAddress = null,
}) {
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new AuthenticationError('Invalid email or password');
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new AuthenticationError('Invalid email or password');
  }

  const userId = user._id.toString();
  const tokenId = crypto.randomUUID();

  const accessToken = generateAccessToken(userId);

  const refreshToken = generateRefreshToken({
    userId,
    tokenId,
  });

  const refreshTokenHash = hashRefreshToken(refreshToken);

  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_TTL_MS
  );

  await RefreshToken.create({
    userId: user._id,
    tokenId,
    tokenHash: refreshTokenHash,
    userAgent,
    ipAddress,
    expiresAt,
    isRevoked: false,
  });

  user.lastLoginAt = new Date();
  await user.save();

  return {
    user: {
      id: userId,
      name: user.name,
      email: user.email,
      lastLoginAt: user.lastLoginAt,
    },
    tokens: {
      accessToken,
      refreshToken,
    },
  };
}