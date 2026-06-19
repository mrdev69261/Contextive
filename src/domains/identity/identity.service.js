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
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt.js';
import { ConflictError, AuthenticationError, NotFoundError, ValidationError } from '../../errors/errorTypes.js';

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

function compareTokenHashes(a, b) {
  const hashA = Buffer.from(a, 'hex');
  const hashB = Buffer.from(b, 'hex');

  if (hashA.length !== hashB.length) {
    return false;
  }

  return crypto.timingSafeEqual(hashA, hashB);
}

export async function refreshUserSession({
  refreshToken,
  userAgent = null,
  ipAddress = null,
}) {
  let decoded;

  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new AuthenticationError('Invalid or expired refresh token');
  }

  const { userId, tokenId } = decoded;

  const existingToken = await RefreshToken.findOne({ tokenId });

  if (!existingToken) {
    throw new AuthenticationError('Invalid or expired refresh token');
  }

  if (existingToken.isRevoked) {
    throw new AuthenticationError('Invalid or expired refresh token');
  }

  if (existingToken.expiresAt.getTime() <= Date.now()) {
    throw new AuthenticationError('Invalid or expired refresh token');
  }

  if (existingToken.userId.toString() !== userId) {
    throw new AuthenticationError('Invalid or expired refresh token');
  }

  const incomingTokenHash = hashRefreshToken(refreshToken);

  if (!compareTokenHashes(incomingTokenHash, existingToken.tokenHash)) {
    throw new AuthenticationError('Invalid or expired refresh token');
  }

  existingToken.isRevoked = true;
  await existingToken.save();

  const user = await User.findById(userId);

  if (!user) {
    throw new AuthenticationError('Invalid or expired refresh token');
  }

  const newTokenId = crypto.randomUUID();
  const newAccessToken = generateAccessToken(userId);
  const newRefreshToken = generateRefreshToken({
    userId,
    tokenId: newTokenId,
  });

  const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
  const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await RefreshToken.create({
    userId: user._id,
    tokenId: newTokenId,
    tokenHash: newRefreshTokenHash,
    userAgent,
    ipAddress,
    expiresAt: newExpiresAt,
    isRevoked: false,
  });

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    },
    tokens: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    },
  };
}

export async function logoutUserSession({ refreshToken }) {
  let decoded;

  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new AuthenticationError('Invalid or expired refresh token');
  }

  const { tokenId } = decoded;

  const existingToken = await RefreshToken.findOne({ tokenId });

  if (!existingToken) {
    throw new AuthenticationError('Invalid or expired refresh token');
  }

  if (existingToken.isRevoked) {
    throw new AuthenticationError('Invalid or expired refresh token');
  }

  existingToken.isRevoked = true;
  existingToken.revokedAt = new Date();

  await existingToken.save();

  return {
    session: {
      tokenId: existingToken.tokenId,
      revokedAt: existingToken.revokedAt,
    },
  };

}

export async function getCurrentUser(userId) {
  const user = await User.findById(userId);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
}

export async function changePassword({ userId, currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+password');

  if (!user) {
    throw new AuthenticationError('Authentication failed');
  }

  const isCurrentPasswordValid = await user.comparePassword(currentPassword);

  if (!isCurrentPasswordValid) {
    throw new AuthenticationError('Current password is incorrect');
  }

  const isSamePassword = await user.comparePassword(newPassword);

  if (isSamePassword) {
    throw new ValidationError('New password must be different from current password');
  }

  user.password = newPassword;
  await user.save();

  const revokedAt = new Date();

  await RefreshToken.updateMany(
    {
      userId: user._id,
      isRevoked: false,
    },
    {
      $set: {
        isRevoked: true,
        revokedAt,
      },
    }
  );

  return {
    success: true,
  };
}