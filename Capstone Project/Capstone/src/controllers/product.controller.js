const Product = require('../models/Product');
const Order = require('../models/Order');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const getProducts = asyncHandler(async (req, res) => {
  const {
    search,
    category,
    minPrice,
    maxPrice,
    seller,
    inStock,
    sort = '-createdAt'
  } = req.query;

  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
  const skip = (page - 1) * limit;

  const query = { isActive: true };

  if (search) {
    query.$text = { $search: search };
  }

  if (category) {
    query.category = category;
  }

  if (seller) {
    query.seller = seller;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    query.priceCents = {};
    if (minPrice !== undefined) query.priceCents.$gte = Math.round(Number(minPrice) * 100);
    if (maxPrice !== undefined) query.priceCents.$lte = Math.round(Number(maxPrice) * 100);
  }

  if (inStock !== undefined) {
    const isInStock = String(inStock).toLowerCase() === 'true';
    if (isInStock) {
      query.stock = { $gt: 0 };
    } else {
      query.stock = 0;
    }
  }

  // Parse sorting parameter
  let sortOption = { createdAt: -1 };
  if (sort) {
    if (sort === 'price') sortOption = { priceCents: 1 };
    else if (sort === '-price') sortOption = { priceCents: -1 };
    else if (sort === 'name') sortOption = { name: 1 };
    else if (sort === '-name') sortOption = { name: -1 };
    else if (sort === 'sold') sortOption = { soldCount: -1 };
    else if (sort === 'createdAt') sortOption = { createdAt: 1 };
    else if (sort === '-createdAt') sortOption = { createdAt: -1 };
  }

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate('category', 'name slug')
      .populate('seller', 'name email')
      .sort(sortOption)
      .skip(skip)
      .limit(limit),
    Product.countDocuments(query)
  ]);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Products fetched successfully',
    data: { products },
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});

const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('category', 'name slug description')
    .populate('seller', 'name email');

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Product fetched successfully',
    data: { product }
  });
});

const createProduct = asyncHandler(async (req, res) => {
  const sellerId = req.user.role === 'seller' ? req.user._id : req.body.seller || req.user._id;

  const product = await Product.create({
    ...req.body,
    seller: sellerId
  });

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Product created successfully',
    data: { product }
  });
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Seller cannot update product owned by another seller
  if (req.user.role === 'seller' && product.seller.toString() !== req.user._id.toString()) {
    throw new AppError('Forbidden: You can only edit your own products', 403);
  }

  Object.assign(product, req.body);
  await product.save();

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Product updated successfully',
    data: { product }
  });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Seller cannot delete product owned by another seller
  if (req.user.role === 'seller' && product.seller.toString() !== req.user._id.toString()) {
    throw new AppError('Forbidden: You can only delete your own products', 403);
  }

  // Check if product appears in any order
  const orderExists = await Order.findOne({ 'items.product': product._id });

  if (orderExists) {
    // Soft delete
    product.isActive = false;
    await product.save();
    return sendSuccess(res, {
      statusCode: 200,
      message: 'Product appears in existing orders; soft-deleted (marked inactive) successfully'
    });
  }

  // Hard delete
  await product.deleteOne();
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Product deleted permanently successfully'
  });
});

const getMyProducts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
  const skip = (page - 1) * limit;

  const filter = { seller: req.user._id };

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter)
  ]);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Seller products fetched successfully',
    data: { products },
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getMyProducts
};
