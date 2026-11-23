const inventoryService = require('../services/inventory.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const updateStock = asyncHandler(async (req, res) => {
  const { delta, set } = req.body;
  const product = await inventoryService.updateStock({
    productId: req.params.productId,
    delta,
    set,
    user: req.user
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Stock updated successfully',
    data: { product }
  });
});

const getLowStock = asyncHandler(async (req, res) => {
  const products = await inventoryService.getLowStock({
    user: req.user
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Low stock products fetched successfully',
    data: {
      count: products.length,
      products
    }
  });
});

module.exports = {
  updateStock,
  getLowStock
};
