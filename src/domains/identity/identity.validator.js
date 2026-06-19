//
// PURPOSE:
// Request-level validation for Identity domain endpoints.
//
// DESIGN NOTES:
// - This file validates incoming request shape and basic input quality
// - It does NOT perform database checks or business-rule validation
// - It is intended to run before controllers

import { body } from 'express-validator';

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 50;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

export const registerValidator = [
  body('name')
    .exists({ checkFalsy: true })
    .withMessage('Name is required')
    .bail()
    .isString()
    .withMessage('Name must be a string')
    .bail()
    .trim()
    .isLength({ min: NAME_MIN_LENGTH, max: NAME_MAX_LENGTH })
    .withMessage(`Name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`),

  body('email')
    .exists({ checkFalsy: true })
    .withMessage('Email is required')
    .bail()
    .isString()
    .withMessage('Email must be a string')
    .bail()
    .trim()
    .isEmail()
    .withMessage('Email must be a valid email address')
    .bail()
    .normalizeEmail(),

  body('password')
    .exists({ checkFalsy: true })
    .withMessage('Password is required')
    .bail()
    .isString()
    .withMessage('Password must be a string')
    .bail()
    .isLength({ min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH })
    .withMessage(
      `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`
    ),
];

export const loginValidator = [
  body('email')
    .exists({ checkFalsy: true })
    .withMessage('Email is required')
    .bail()
    .isString()
    .withMessage('Email must be a string')
    .bail()
    .trim()
    .isEmail()
    .withMessage('Email must be a valid email address')
    .bail()
    .normalizeEmail(),

  body('password')
    .exists({ checkFalsy: true })
    .withMessage('Password is required')
    .bail()
    .isString()
    .withMessage('Password must be a string'),
];

export const refreshValidator = [
  body('refreshToken')
    .exists({ checkFalsy: true })
    .withMessage('Refresh token is required')
    .bail()
    .isString()
    .withMessage('Refresh token must be a string')
    .bail()
    .trim(),
];

export const logoutValidator = [
  body('refreshToken')
    .exists({ checkFalsy: true })
    .withMessage('Refresh token is required')
    .bail()
    .isString()
    .withMessage('Refresh token must be a string')
    .bail()
    .trim(),
];

export const changePasswordValidator = [
  body('currentPassword')
    .exists({ checkFalsy: true })
    .withMessage('Current password is required')
    .bail()
    .isString()
    .withMessage('Current password must be a string'),

  body('newPassword')
    .exists({ checkFalsy: true })
    .withMessage('New password is required')
    .bail()
    .isString()
    .withMessage('New password must be a string'),
];