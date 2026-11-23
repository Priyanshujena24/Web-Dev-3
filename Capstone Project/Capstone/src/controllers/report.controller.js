const reportService = require('../services/report.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');

const getSalesSummary = asyncHandler(async (req, res) => {
  const { from, to, groupBy } = req.query;

  const summary = await reportService.getSalesSummary({
    user: req.user,
    from,
    to,
    groupBy
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Sales summary report generated successfully',
    data: { summary }
  });
});

const getBestSelling = asyncHandler(async (req, res) => {
  const { from, to, limit } = req.query;

  const bestSelling = await reportService.getBestSellingProducts({
    user: req.user,
    from,
    to,
    limit
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Best-selling products report generated successfully',
    data: { bestSelling }
  });
});

const getInventorySummary = asyncHandler(async (req, res) => {
  const inventorySummary = await reportService.getInventorySummary({
    user: req.user
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Inventory summary report generated successfully',
    data: { inventorySummary }
  });
});

module.exports = {
  getSalesSummary,
  getBestSelling,
  getInventorySummary
};
