const bcrypt = require('bcrypt');
const env = require('../config/env');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.role) {
    filter.role = req.query.role;
  }

  const [users, total] = await Promise.all([
    User.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
    User.countDocuments(filter)
  ]);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Users fetched successfully',
    data: { users },
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: 'User fetched successfully',
    data: { user }
  });
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive },
    { new: true, runValidators: true }
  );

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: `User account ${isActive ? 'activated' : 'deactivated'} successfully`,
    data: { user }
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: 'User deleted successfully'
  });
});

const updateMe = asyncHandler(async (req, res) => {
  const { name, address } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (address !== undefined) updates.address = address;

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Profile updated successfully',
    data: { user }
  });
});

const updateMyPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!user || !(await user.comparePassword(currentPassword))) {
    throw new AppError('Incorrect current password', 400);
  }

  user.passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
  await user.save();

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Password updated successfully'
  });
});

module.exports = {
  getUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  updateMe,
  updateMyPassword
};
