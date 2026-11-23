const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const RefreshToken = require('../models/RefreshToken');
const User = require('../models/User');

const parseTtlToMs = (ttlString) => {
  const match = ttlString.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return val * 1000;
    case 'm': return val * 60 * 1000;
    case 'h': return val * 60 * 60 * 1000;
    case 'd': return val * 24 * 60 * 60 * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
};

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL }
  );
};

const generateRefreshToken = async (user) => {
  const rawToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(rawToken);
  const ttlMs = parseTtlToMs(env.REFRESH_TOKEN_TTL);
  const expiresAt = new Date(Date.now() + ttlMs);

  await RefreshToken.create({
    user: user._id,
    tokenHash,
    expiresAt
  });

  return rawToken;
};

const rotateRefreshToken = async (rawToken) => {
  if (!rawToken) {
    throw new AppError('Refresh token is required', 401);
  }

  const tokenHash = hashToken(rawToken);
  const tokenRecord = await RefreshToken.findOne({ tokenHash });

  if (!tokenRecord) {
    throw new AppError('Invalid refresh token', 401);
  }

  // Token reuse detection: if token is already revoked, revoke all tokens for this user
  if (tokenRecord.revokedAt) {
    await RefreshToken.updateMany(
      { user: tokenRecord.user },
      { revokedAt: new Date() }
    );
    throw new AppError('Invalid or reused refresh token. All sessions revoked for security.', 401);
  }

  // Check expiration
  if (tokenRecord.expiresAt < new Date()) {
    throw new AppError('Refresh token has expired. Please log in again.', 401);
  }

  const user = await User.findById(tokenRecord.user);
  if (!user || !user.isActive) {
    throw new AppError('User not found or account deactivated', 401);
  }

  // Generate new token pair
  const newAccessToken = generateAccessToken(user);
  const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
  const newTokenHash = hashToken(newRawRefreshToken);
  const ttlMs = parseTtlToMs(env.REFRESH_TOKEN_TTL);
  const expiresAt = new Date(Date.now() + ttlMs);

  // Revoke current token with replacedBy reference
  tokenRecord.revokedAt = new Date();
  tokenRecord.replacedBy = newTokenHash;
  await tokenRecord.save();

  // Create new refresh token record
  await RefreshToken.create({
    user: user._id,
    tokenHash: newTokenHash,
    expiresAt
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRawRefreshToken,
    user
  };
};

const revokeRefreshToken = async (rawToken) => {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);
  await RefreshToken.findOneAndUpdate(
    { tokenHash, revokedAt: null },
    { revokedAt: new Date() }
  );
};

const revokeAllUserTokens = async (userId) => {
  await RefreshToken.updateMany(
    { user: userId, revokedAt: null },
    { revokedAt: new Date() }
  );
};

module.exports = {
  hashToken,
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens
};
