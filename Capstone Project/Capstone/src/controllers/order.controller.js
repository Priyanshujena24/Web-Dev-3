const Order = require('../models/Order');
const orderService = require('../services/order.service');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const checkout = asyncHandler(async (req, res) => {
  const { delivery } = req.body;

  const result = await orderService.checkout({
    userId: req.user._id,
    delivery
  });

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Order(s) placed successfully',
    data: result
  });
});

const getOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
  const skip = (page - 1) * limit;

  const filter = {};

  // Role filtering
  if (req.user.role === 'customer') {
    filter.customer = req.user._id;
  } else if (req.user.role === 'seller') {
    filter.seller = req.user._id;
  }

  if (req.query.status) {
    filter.status = req.query.status;
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('customer', 'name email')
      .populate('seller', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter)
  ]);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Orders fetched successfully',
    data: { orders },
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('customer', 'name email')
    .populate('seller', 'name email')
    .populate('items.product', 'name category');

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Customer ownership check (404 as specified)
  if (req.user.role === 'customer' && order.customer._id.toString() !== req.user._id.toString()) {
    throw new AppError('Order not found', 404);
  }

  // Seller ownership check (403 or only assigned)
  if (req.user.role === 'seller' && order.seller._id.toString() !== req.user._id.toString()) {
    throw new AppError('Forbidden: You can only view orders assigned to you', 403);
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Order fetched successfully',
    data: { order }
  });
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;

  const order = await orderService.updateOrderStatus({
    orderId: req.params.id,
    status,
    note,
    user: req.user
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: `Order status updated to ${status} successfully`,
    data: { order }
  });
});

const cancelOrder = asyncHandler(async (req, res) => {
  const { note } = req.body || {};

  const order = await orderService.cancelOrder({
    orderId: req.params.id,
    user: req.user,
    note
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Order cancelled successfully and stock restored',
    data: { order }
  });
});

module.exports = {
  checkout,
  getOrders,
  getOrderById,
  updateStatus,
  cancelOrder
};
