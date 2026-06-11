import asyncHandler from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/apiResponse.js';
import { registerUser } from './identity.service.js';

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

// console.log(req.body);