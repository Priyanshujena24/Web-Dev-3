const appEvents = require('./appEvents');
const { emitToUser, emitToRole } = require('../sockets');

/**
 * Register listeners for decoupled event-driven side effects.
 * Wrapped in try/catch to ensure side effect errors do not crash or disrupt core flows.
 */
const initListeners = () => {
  // Listener: order.placed
  appEvents.on('order.placed', (order) => {
    try {
      if (process.env.NODE_ENV !== 'test') {
        console.log(`[Event: order.placed] Order ${order._id} placed for seller ${order.seller}`);
      }
      emitToUser(order.seller.toString(), 'order:new', {
        orderId: order._id,
        checkoutId: order.checkoutId,
        totalCents: order.totalCents,
        itemsCount: order.items ? order.items.length : 0,
        createdAt: order.createdAt
      });
    } catch (err) {
      console.error(`[EventListener Error: order.placed] ${err.message}`);
    }
  });

  // Listener: order.statusChanged
  appEvents.on('order.statusChanged', ({ order, previousStatus, changedBy }) => {
    try {
      if (process.env.NODE_ENV !== 'test') {
        console.log(
          `[Event: order.statusChanged] Order ${order._id} transitioned from ${previousStatus} to ${order.status}`
        );
      }

      // Notify customer
      emitToUser(order.customer.toString(), 'order:status', {
        orderId: order._id,
        status: order.status,
        previousStatus,
        at: new Date()
      });

      // If changed by admin, notify the seller as well
      if (changedBy && changedBy.role === 'admin') {
        emitToUser(order.seller.toString(), 'order:status', {
          orderId: order._id,
          status: order.status,
          previousStatus,
          changedByAdmin: true,
          at: new Date()
        });
      }
    } catch (err) {
      console.error(`[EventListener Error: order.statusChanged] ${err.message}`);
    }
  });

  // Listener: stock.low
  appEvents.on('stock.low', (stockData) => {
    try {
      if (process.env.NODE_ENV !== 'test') {
        console.log(
          `[Event: stock.low] Product ${stockData.product} (${stockData.name}) low stock alert: ${stockData.currentStock} left (threshold: ${stockData.threshold})`
        );
      }

      // Notify seller
      if (stockData.seller) {
        emitToUser(stockData.seller.toString(), 'stock:low', stockData);
      }

      // Notify all admins
      emitToRole('admin', 'stock:low', stockData);
    } catch (err) {
      console.error(`[EventListener Error: stock.low] ${err.message}`);
    }
  });
};

module.exports = {
  initListeners
};
