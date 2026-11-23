const mongoose = require('mongoose');
const { ORDER_STATUSES } = require('../utils/orderStatus');

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    unitPriceCents: {
      type: Number,
      required: true,
      min: 1
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    lineTotalCents: {
      type: Number,
      required: true,
      min: 1
    }
  },
  {
    _id: false,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.unitPrice = (ret.unitPriceCents / 100).toFixed(2);
        ret.lineTotal = (ret.lineTotalCents / 100).toFixed(2);
        return ret;
      }
    }
  }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    at: {
      type: Date,
      default: Date.now
    },
    note: {
      type: String,
      default: ''
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    checkoutId: {
      type: String,
      required: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    items: [orderItemSchema],
    subtotalCents: {
      type: Number,
      required: true,
      min: 0
    },
    totalCents: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUSES),
      default: ORDER_STATUSES.PENDING
    },
    statusHistory: [statusHistorySchema],
    delivery: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      line1: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true }
    },
    payment: {
      method: { type: String, default: 'SIMULATED' },
      status: { type: String, enum: ['PAID', 'REFUNDED'], default: 'PAID' },
      simulated: { type: Boolean, default: true },
      reference: { type: String, required: true }
    },
    cancelledAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.subtotal = (ret.subtotalCents / 100).toFixed(2);
        ret.total = (ret.totalCents / 100).toFixed(2);
        delete ret.__v;
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

// Indexes required by specification:
// 5. Order: { customer: 1, createdAt: -1 }
orderSchema.index({ customer: 1, createdAt: -1 });

// 6. Order: { seller: 1, status: 1, createdAt: -1 }
orderSchema.index({ seller: 1, status: 1, createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
