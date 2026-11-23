const ORDER_STATUSES = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED'
};

const ALLOWED_TRANSITIONS = {
  [ORDER_STATUSES.PENDING]: [ORDER_STATUSES.CONFIRMED, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.CONFIRMED]: [ORDER_STATUSES.SHIPPED, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.SHIPPED]: [ORDER_STATUSES.DELIVERED],
  [ORDER_STATUSES.DELIVERED]: [],
  [ORDER_STATUSES.CANCELLED]: []
};

/**
 * Validates if a transition is valid according to state machine rules
 */
const isValidTransition = (currentStatus, targetStatus) => {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
};

/**
 * Validates role-specific transition permissions
 * - Customer: may only cancel own order (PENDING or CONFIRMED)
 * - Seller: may move own orders CONFIRMED -> SHIPPED -> DELIVERED and cancel PENDING/CONFIRMED
 * - Admin: any valid transition on any order
 */
const canRolePerformTransition = (role, currentStatus, targetStatus) => {
  if (role === 'admin') {
    return isValidTransition(currentStatus, targetStatus);
  }

  if (role === 'seller') {
    if (targetStatus === ORDER_STATUSES.CANCELLED) {
      return (
        (currentStatus === ORDER_STATUSES.PENDING || currentStatus === ORDER_STATUSES.CONFIRMED) &&
        isValidTransition(currentStatus, targetStatus)
      );
    }
    // Seller can move CONFIRMED -> SHIPPED -> DELIVERED, and PENDING -> CONFIRMED
    return isValidTransition(currentStatus, targetStatus);
  }

  if (role === 'customer') {
    // Customer can only cancel PENDING or CONFIRMED orders
    return (
      targetStatus === ORDER_STATUSES.CANCELLED &&
      (currentStatus === ORDER_STATUSES.PENDING || currentStatus === ORDER_STATUSES.CONFIRMED)
    );
  }

  return false;
};

module.exports = {
  ORDER_STATUSES,
  ALLOWED_TRANSITIONS,
  isValidTransition,
  canRolePerformTransition
};
