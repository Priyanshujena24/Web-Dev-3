const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { ORDER_STATUSES } = require('../utils/orderStatus');

/**
 * Pipeline 1: Sales Summary
 * Match (CONFIRMED, SHIPPED, DELIVERED), seller filter, date range
 * Group by day (%Y-%m-%d) or month (%Y-%m)
 * Returns orders count, revenueCents, formatted revenue, unitsSold
 */
const getSalesSummary = async ({ user, from, to, groupBy = 'day' }) => {
  const matchStage = {
    status: {
      $in: [
        ORDER_STATUSES.CONFIRMED,
        ORDER_STATUSES.SHIPPED,
        ORDER_STATUSES.DELIVERED
      ]
    }
  };

  if (user.role === 'seller') {
    matchStage.seller = new mongoose.Types.ObjectId(user._id);
  }

  if (from || to) {
    matchStage.createdAt = {};
    if (from) matchStage.createdAt.$gte = new Date(from);
    if (to) matchStage.createdAt.$lte = new Date(to);
  }

  const format = groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: { $dateToString: { format, date: '$createdAt' } },
        orders: { $sum: 1 },
        revenueCents: { $sum: '$totalCents' },
        unitsSold: {
          $sum: {
            $reduce: {
              input: '$items',
              initialValue: 0,
              in: { $add: ['$$value', '$$this.quantity'] }
            }
          }
        }
      }
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        date: '$_id',
        _id: 0,
        orders: 1,
        revenueCents: 1,
        revenue: {
          $concat: [
            { $toString: { $divide: ['$revenueCents', 100] } }
          ]
        },
        unitsSold: 1
      }
    }
  ];

  const results = await Order.aggregate(pipeline);
  return results.map((item) => ({
    ...item,
    revenue: (item.revenueCents / 100).toFixed(2)
  }));
};

/**
 * Pipeline 2: Best-selling Products
 * Match -> unwind items -> group by items.product -> sort -> limit -> lookup products
 */
const getBestSellingProducts = async ({ user, from, to, limit = 5 }) => {
  const matchStage = {
    status: {
      $in: [
        ORDER_STATUSES.CONFIRMED,
        ORDER_STATUSES.SHIPPED,
        ORDER_STATUSES.DELIVERED
      ]
    }
  };

  if (user.role === 'seller') {
    matchStage.seller = new mongoose.Types.ObjectId(user._id);
  }

  if (from || to) {
    matchStage.createdAt = {};
    if (from) matchStage.createdAt.$gte = new Date(from);
    if (to) matchStage.createdAt.$lte = new Date(to);
  }

  const pipeline = [
    { $match: matchStage },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        name: { $first: '$items.name' },
        totalQuantitySold: { $sum: '$items.quantity' },
        totalRevenueCents: { $sum: '$items.lineTotalCents' }
      }
    },
    { $sort: { totalQuantitySold: -1 } },
    { $limit: parseInt(limit, 10) || 5 },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'productDetails'
      }
    },
    {
      $unwind: {
        path: '$productDetails',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        productId: '$_id',
        _id: 0,
        name: 1,
        totalQuantitySold: 1,
        totalRevenueCents: 1,
        currentStock: '$productDetails.stock',
        isActive: '$productDetails.isActive'
      }
    }
  ];

  const results = await Order.aggregate(pipeline);
  return results.map((item) => ({
    ...item,
    totalRevenue: (item.totalRevenueCents / 100).toFixed(2)
  }));
};

/**
 * Pipeline 3: Inventory Summary
 * Product match (seller if role=seller, isActive)
 * Group by category: product count, total units, stock value cents, low stock count
 * Lookup category details -> sort
 */
const getInventorySummary = async ({ user }) => {
  const matchStage = {
    isActive: true
  };

  if (user.role === 'seller') {
    matchStage.seller = new mongoose.Types.ObjectId(user._id);
  }

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: '$category',
        productCount: { $sum: 1 },
        totalUnits: { $sum: '$stock' },
        stockValueCents: {
          $sum: { $multiply: ['$stock', '$priceCents'] }
        },
        lowStockCount: {
          $sum: {
            $cond: [{ $lte: ['$stock', '$lowStockThreshold'] }, 1, 0]
          }
        }
      }
    },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'category'
      }
    },
    {
      $unwind: {
        path: '$category',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        categoryId: '$_id',
        _id: 0,
        categoryName: '$category.name',
        categorySlug: '$category.slug',
        productCount: 1,
        totalUnits: 1,
        stockValueCents: 1,
        lowStockCount: 1
      }
    },
    { $sort: { totalUnits: -1 } }
  ];

  const results = await Product.aggregate(pipeline);
  return results.map((item) => ({
    ...item,
    stockValue: (item.stockValueCents / 100).toFixed(2)
  }));
};

module.exports = {
  getSalesSummary,
  getBestSellingProducts,
  getInventorySummary
};
