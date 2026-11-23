const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Order = require('../models/Order');
const AppError = require('../utils/AppError');
const appEvents = require('../events/appEvents');
const { ORDER_STATUSES, isValidTransition, canRolePerformTransition } = require('../utils/orderStatus');

/**
 * Checkout service:
 * 1. Load cart; reject empty
 * 2. Re-fetch products fresh, validate active and stock
 * 3. Atomic stock decrement per item with compensation if any fails
 * 4. Group items by seller; create Order per seller
 * 5. Clear cart
 * 6. Emit events (order.placed, stock.low)
 * 7. Return 201 with created orders and checkoutId
 */
const checkout = async ({ userId, delivery }) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart || !cart.items || cart.items.length === 0) {
    throw new AppError('Cart is empty', 400);
  }

  // 2. Fetch fresh products and validate
  const productIds = cart.items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map();
  products.forEach((p) => productMap.set(p._id.toString(), p));

  for (const item of cart.items) {
    const product = productMap.get(item.product.toString());
    if (!product || !product.isActive) {
      throw new AppError(`Product '${product ? product.name : item.product}' is no longer available`, 400);
    }
    if (product.stock < item.quantity) {
      throw new AppError(`Product '${product.name}' does not have enough stock`, 409);
    }
  }

  // 3. Atomic stock decrement per item with rollback/compensation
  const decrementedItems = [];
  const updatedProducts = [];

  for (const item of cart.items) {
    const decremented = await Product.findOneAndUpdate(
      {
        _id: item.product,
        isActive: true,
        stock: { $gte: item.quantity }
      },
      {
        $inc: {
          stock: -item.quantity,
          soldCount: item.quantity
        }
      },
      { new: true }
    );

    if (!decremented) {
      // Compensate / Rollback all previously decremented items
      for (const dec of decrementedItems) {
        await Product.findByIdAndUpdate(dec.productId, {
          $inc: {
            stock: dec.quantity,
            soldCount: -dec.quantity
          }
        });
      }
      const product = productMap.get(item.product.toString());
      throw new AppError(
        `Product '${product ? product.name : item.product}' does not have enough stock`,
        409
      );
    }

    decrementedItems.push({
      productId: item.product,
      quantity: item.quantity
    });
    updatedProducts.push(decremented);
  }

  // 4. Group items by seller
  const checkoutId = uuidv4();
  const sellerOrdersMap = new Map();

  for (const item of cart.items) {
    const product = productMap.get(item.product.toString());
    const sellerId = product.seller.toString();

    const unitPriceCents = product.priceCents;
    const lineTotalCents = unitPriceCents * item.quantity;

    const orderItem = {
      product: product._id,
      name: product.name,
      unitPriceCents,
      quantity: item.quantity,
      lineTotalCents
    };

    if (!sellerOrdersMap.has(sellerId)) {
      sellerOrdersMap.set(sellerId, []);
    }
    sellerOrdersMap.get(sellerId).push(orderItem);
  }

  const ordersToInsert = [];
  for (const [sellerId, items] of sellerOrdersMap.entries()) {
    const subtotalCents = items.reduce((sum, it) => sum + it.lineTotalCents, 0);
    const reference = 'SIM-' + crypto.randomBytes(6).toString('hex').toUpperCase();

    ordersToInsert.push({
      checkoutId,
      customer: userId,
      seller: sellerId,
      items,
      subtotalCents,
      totalCents: subtotalCents,
      status: ORDER_STATUSES.PENDING,
      statusHistory: [
        {
          status: ORDER_STATUSES.PENDING,
          changedBy: userId,
          at: new Date(),
          note: 'Order placed'
        }
      ],
      delivery,
      payment: {
        method: 'SIMULATED',
        status: 'PAID',
        simulated: true,
        reference
      }
    });
  }

  let createdOrders = [];
  try {
    createdOrders = await Order.insertMany(ordersToInsert);
  } catch (err) {
    // Compensate stock if order creation fails
    for (const dec of decrementedItems) {
      await Product.findByIdAndUpdate(dec.productId, {
        $inc: {
          stock: dec.quantity,
          soldCount: -dec.quantity
        }
      });
    }
    throw new AppError(`Order placement failed: ${err.message}`, 500);
  }

  // 5. Clear cart
  cart.items = [];
  await cart.save();

  // 6. Emit events
  for (const order of createdOrders) {
    appEvents.emit('order.placed', order);
  }

  for (const product of updatedProducts) {
    if (product.stock <= product.lowStockThreshold) {
      appEvents.emit('stock.low', {
        product: product._id,
        name: product.name,
        currentStock: product.stock,
        threshold: product.lowStockThreshold,
        seller: product.seller
      });
    }
  }

  // 7. Return created orders and checkoutId
  return {
    checkoutId,
    orders: createdOrders
  };
};

/**
 * Update order status per state machine rules
 */
const updateOrderStatus = async ({ orderId, status: targetStatus, note, user }) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Ownership verification
  if (user.role === 'customer') {
    if (order.customer.toString() !== user._id.toString()) {
      throw new AppError('Order not found', 404);
    }
    if (targetStatus !== ORDER_STATUSES.CANCELLED) {
      throw new AppError('Forbidden: Customers can only cancel orders', 403);
    }
  } else if (user.role === 'seller') {
    if (order.seller.toString() !== user._id.toString()) {
      throw new AppError('Forbidden: You can only update your own orders', 403);
    }
  }

  // If targetStatus is CANCELLED, invoke cancelOrder
  if (targetStatus === ORDER_STATUSES.CANCELLED) {
    return cancelOrder({ orderId, user, note });
  }

  // Transition validation
  if (!isValidTransition(order.status, targetStatus)) {
    const { ALLOWED_TRANSITIONS } = require('../utils/orderStatus');
    const allowed = ALLOWED_TRANSITIONS[order.status] || [];
    throw new AppError(
      `Invalid status transition from ${order.status} to ${targetStatus}. Allowed transitions: ${allowed.join(', ') || 'none'}`,
      409
    );
  }

  if (!canRolePerformTransition(user.role, order.status, targetStatus)) {
    throw new AppError(`Forbidden: Role '${user.role}' cannot perform transition to '${targetStatus}'`, 403);
  }

  const previousStatus = order.status;
  order.status = targetStatus;
  order.statusHistory.push({
    status: targetStatus,
    changedBy: user._id,
    at: new Date(),
    note: note || `Status updated to ${targetStatus}`
  });

  await order.save();

  appEvents.emit('order.statusChanged', {
    order,
    previousStatus,
    changedBy: user
  });

  return order;
};

/**
 * Cancel order with atomic stock restoration
 * Idempotent guard with status check
 */
const cancelOrder = async ({ orderId, user, note }) => {
  const existingOrder = await Order.findById(orderId);
  if (!existingOrder) {
    throw new AppError('Order not found', 404);
  }

  // Ownership rules
  if (user.role === 'customer') {
    if (existingOrder.customer.toString() !== user._id.toString()) {
      throw new AppError('Order not found', 404);
    }
  } else if (user.role === 'seller') {
    if (existingOrder.seller.toString() !== user._id.toString()) {
      throw new AppError('Forbidden: You can only cancel your own orders', 403);
    }
  }

  // Cancellation is only allowed for PENDING and CONFIRMED
  if (!['PENDING', 'CONFIRMED'].includes(existingOrder.status)) {
    const { ALLOWED_TRANSITIONS } = require('../utils/orderStatus');
    const allowed = ALLOWED_TRANSITIONS[existingOrder.status] || [];
    throw new AppError(
      `Cannot cancel order in ${existingOrder.status} status. Allowed transitions: ${allowed.join(', ') || 'none'}`,
      409
    );
  }

  // Idempotent atomic update to CANCELLED
  const cancelledOrder = await Order.findOneAndUpdate(
    {
      _id: orderId,
      status: { $in: [ORDER_STATUSES.PENDING, ORDER_STATUSES.CONFIRMED] }
    },
    {
      $set: {
        status: ORDER_STATUSES.CANCELLED,
        'payment.status': 'REFUNDED',
        cancelledAt: new Date()
      },
      $push: {
        statusHistory: {
          status: ORDER_STATUSES.CANCELLED,
          changedBy: user._id,
          at: new Date(),
          note: note || 'Order cancelled'
        }
      }
    },
    { new: true }
  );

  if (!cancelledOrder) {
    throw new AppError('Order could not be cancelled or has already been cancelled/shipped', 409);
  }

  // Atomically restore stock for all items
  for (const item of cancelledOrder.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: {
        stock: item.quantity,
        soldCount: -item.quantity
      }
    });
  }

  appEvents.emit('order.statusChanged', {
    order: cancelledOrder,
    previousStatus: existingOrder.status,
    changedBy: user
  });

  return cancelledOrder;
};

module.exports = {
  checkout,
  updateOrderStatus,
  cancelOrder
};
