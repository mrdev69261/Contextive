import asyncHandler from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import { registerUser, loginUser, refreshUserSession, logoutUserSession } from './identity.service.js';

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const result = await registerUser({
    name,
    email,
    password,
    userAgent: req.get('user-agent') || null,
    ipAddress: req.ip || null,
  });

  return ApiResponse.created(
    res,
    result,
    'User registered successfully'
  );
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await loginUser({
    email,
    password,
    userAgent: req.get('user-agent') || null,
    ipAddress: req.ip || null,
  });

  return ApiResponse.success(
    res,
    result,
    'Login successful'
  );
});

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  const result = await refreshUserSession({
    refreshToken,
    userAgent: req.get('user-agent') || null,
    ipAddress: req.ip || null,
  });

  return ApiResponse.success(
    res,
    result,
    'Session refreshed successfully'
  );
});

export const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  const result = await logoutUserSession({ refreshToken });

  return ApiResponse.success(res, {
    statusCode: 200,
    message: 'Logout successful',
    data: result,
  });
});

// console.log(req.body);