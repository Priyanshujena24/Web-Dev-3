const Cart = require('../models/Cart');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, formatPrice } = require('../utils/response');

const getCart = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ user: req.user._id }).populate({
    path: 'items.product',
    select: 'name priceCents stock isActive category seller',
    populate: { path: 'category', select: 'name' }
  });

  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }

  const items = [];
  const warnings = [];
  let totalCents = 0;

  for (const item of cart.items) {
    const product = item.product;
    if (!product || !product.isActive) {
      warnings.push(`Product '${product ? product.name : 'Unknown'}' is no longer available.`);
      continue;
    }

    if (product.stock === 0) {
      warnings.push(`Product '${product.name}' is out of stock.`);
    } else if (product.stock < item.quantity) {
      warnings.push(
        `Product '${product.name}' has only ${product.stock} items remaining (requested: ${item.quantity}).`
      );
    }

    const unitPriceCents = product.priceCents;
    const lineTotalCents = unitPriceCents * item.quantity;
    totalCents += lineTotalCents;

    items.push({
      product: {
        _id: product._id,
        name: product.name,
        category: product.category,
        stock: product.stock,
        isActive: product.isActive,
        unitPriceCents,
        price: formatPrice(unitPriceCents)
      },
      quantity: item.quantity,
      lineTotalCents,
      lineTotal: formatPrice(lineTotalCents)
    });
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Cart fetched successfully',
    data: {
      items,
      totalCents,
      total: formatPrice(totalCents),
      warnings
    }
  });
});

const addItem = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    throw new AppError('Product not found or is no longer active', 404);
  }

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = new Cart({ user: req.user._id, items: [] });
  }

  const existingIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId
  );

  const currentQty = existingIndex > -1 ? cart.items[existingIndex].quantity : 0;
  const resultingQty = currentQty + quantity;

  if (resultingQty > product.stock) {
    throw new AppError(
      `Cannot add ${quantity} item(s). Available stock is ${product.stock} (already in cart: ${currentQty})`,
      400
    );
  }

  if (existingIndex > -1) {
    cart.items[existingIndex].quantity = resultingQty;
  } else {
    cart.items.push({ product: productId, quantity });
  }

  await cart.save();

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Item added to cart successfully',
    data: { cart }
  });
});

const updateItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    throw new AppError('Product not found or inactive', 404);
  }

  if (quantity > product.stock) {
    throw new AppError(`Requested quantity exceeds available stock (${product.stock})`, 400);
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    throw new AppError('Cart not found', 404);
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId
  );

  if (itemIndex === -1) {
    throw new AppError('Product not in cart', 404);
  }

  cart.items[itemIndex].quantity = quantity;
  await cart.save();

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Cart item quantity updated successfully',
    data: { cart }
  });
});

const removeItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    throw new AppError('Cart not found', 404);
  }

  cart.items = cart.items.filter(
    (item) => item.product.toString() !== productId
  );

  await cart.save();

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Item removed from cart successfully',
    data: { cart }
  });
});

const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (cart) {
    cart.items = [];
    await cart.save();
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Cart cleared successfully'
  });
});

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart
};
