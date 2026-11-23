const mongoose = require('mongoose');
const env = require('../config/env');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true
    },
    priceCents: {
      type: Number,
      required: [true, 'Price in cents is required'],
      min: [1, 'Price must be at least 1 cent'],
      validate: {
        validator: Number.isInteger,
        message: 'Price must be an integer (cents)'
      }
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required']
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller is required']
    },
    stock: {
      type: Number,
      required: [true, 'Stock count is required'],
      min: [0, 'Stock cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Stock must be an integer'
      }
    },
    lowStockThreshold: {
      type: Number,
      default: () => env.LOW_STOCK_DEFAULT_THRESHOLD,
      min: [0, 'Low stock threshold cannot be negative']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    soldCount: {
      type: Number,
      default: 0,
      min: [0, 'Sold count cannot be negative']
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.__v;
        delete ret.id;
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

// Virtual for formatted price
productSchema.virtual('price').get(function () {
  if (typeof this.priceCents !== 'number') return '0.00';
  return (this.priceCents / 100).toFixed(2);
});

// Indexes required by specification
// 2. Text index on name and description (powers ?search=)
productSchema.index({ name: 'text', description: 'text' });

// 3. Compound index on category and priceCents
productSchema.index({ category: 1, priceCents: 1 });

// 4. Index on seller and isActive
productSchema.index({ seller: 1, isActive: 1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
