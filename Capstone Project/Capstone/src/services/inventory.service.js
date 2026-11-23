const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const appEvents = require('../events/appEvents');

/**
 * Update product stock via delta or set
 */
const updateStock = async ({ productId, delta, set, user }) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Ownership check: seller can only update own products
  if (user.role === 'seller' && product.seller.toString() !== user._id.toString()) {
    throw new AppError('Forbidden: You can only update stock for your own products', 403);
  }

  let newStock;
  if (set !== undefined) {
    if (set < 0) {
      throw new AppError('Stock cannot be negative', 400);
    }
    newStock = set;
  } else if (delta !== undefined) {
    newStock = product.stock + delta;
    if (newStock < 0) {
      throw new AppError('Stock cannot be negative', 400);
    }
  } else {
    throw new AppError('Either delta or set is required', 400);
  }

  product.stock = newStock;
  await product.save();

  // If low stock, emit alert event
  if (product.stock <= product.lowStockThreshold) {
    appEvents.emit('stock.low', {
      product: product._id,
      name: product.name,
      currentStock: product.stock,
      threshold: product.lowStockThreshold,
      seller: product.seller
    });
  }

  return product;
};

/**
 * Get low stock products
 * Seller: own low stock
 * Admin: all low stock
 */
const getLowStock = async ({ user }) => {
  const query = {
    isActive: true,
    $expr: { $lte: ['$stock', '$lowStockThreshold'] }
  };

  if (user.role === 'seller') {
    query.seller = user._id;
  }

  const products = await Product.find(query).populate('category', 'name slug');
  return products;
};

module.exports = {
  updateStock,
  getLowStock
};
