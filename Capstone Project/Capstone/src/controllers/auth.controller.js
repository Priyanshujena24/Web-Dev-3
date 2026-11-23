const bcrypt = require('bcrypt');
const env = require('../config/env');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const {
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens
} = require('../services/token.service');

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role = 'customer', address } = req.body;

  if (role === 'admin') {
    throw new AppError('Admin registration is not allowed', 400);
  }

  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError('Email is already registered', 409);
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

  const user = await User.create({
    name,
    email,
    passwordHash,
    role,
    address: address || {}
  });

  return sendSuccess(res, {
    statusCode: 201,
    message: 'User registered successfully',
    data: { user }
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account is deactivated. Please contact support.', 401);
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Login successful',
    data: {
      accessToken,
      refreshToken,
      user
    }
  });
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!token) {
    throw new AppError('Refresh token required', 401);
  }

  const { accessToken, refreshToken, user } = await rotateRefreshToken(token);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Token refreshed successfully',
    data: {
      accessToken,
      refreshToken,
      user
    }
  });
});

const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (token) {
    await revokeRefreshToken(token);
  }
  res.clearCookie('refreshToken');

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Logged out successfully'
  });
});

const logoutAll = asyncHandler(async (req, res) => {
  await revokeAllUserTokens(req.user._id);
  res.clearCookie('refreshToken');

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Logged out from all sessions successfully'
  });
});

const getMe = asyncHandler(async (req, res) => {
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Current user profile fetched successfully',
    data: { user: req.user }
  });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  getMe
};
