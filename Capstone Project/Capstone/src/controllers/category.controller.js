const Category = require('../models/Category');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 });
  return sendSuccess(res, {
    statusCode: 200,
    message: 'Categories fetched successfully',
    data: { categories }
  });
});

const getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Category fetched successfully',
    data: { category }
  });
});

const createCategory = asyncHandler(async (req, res) => {
  const { name, description, isActive } = req.body;
  const slug = req.body.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  const category = await Category.create({
    name,
    slug,
    description: description || '',
    isActive: isActive !== undefined ? isActive : true
  });

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Category created successfully',
    data: { category }
  });
});

const updateCategory = asyncHandler(async (req, res) => {
  const updates = { ...req.body };
  if (updates.name && !updates.slug) {
    updates.slug = updates.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }

  const category = await Category.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true
  });

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Category updated successfully',
    data: { category }
  });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const productsCount = await Product.countDocuments({ category: req.params.id });
  if (productsCount > 0) {
    throw new AppError('Cannot delete category: products are assigned to this category', 409);
  }

  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Category deleted successfully'
  });
});

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};
