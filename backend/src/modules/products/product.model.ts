import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

export const PRODUCT_SECTIONS = [
  'customer-favorites',
  'for-you',
  'trending',
  'best-deal',
  'first-order-deal',
  'featured',
] as const;

const variantSchema = new Schema({
  sku: { type: String, required: true, trim: true },
  // Free-form so any product type fits: { Size: 'M' }, { Weight: '5 kg' }, { Colour: 'Red' }.
  options: { type: Map, of: String, default: {} },
  price: { type: Number, required: true, min: 0 }, // poisha
  compareAtPrice: { type: Number, min: 0 }, // poisha
  stock: { type: Number, required: true, min: 0, default: 0 },
});

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    brand: { type: String, trim: true, default: '' },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    images: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    // Specifications shown on the product page, e.g. Material: Cotton.
    attributes: {
      type: [new Schema({ name: String, value: String }, { _id: false })],
      default: [],
    },
    variants: {
      type: [variantSchema],
      validate: {
        validator: (variants: unknown[]) => variants.length > 0,
        message: 'A product needs at least one variant',
      },
    },
    minOrderQty: { type: Number, default: 1, min: 1 },
    sections: { type: [{ type: String, enum: PRODUCT_SECTIONS }], default: [], index: true },
    status: { type: String, enum: ['draft', 'active'], default: 'active', index: true },

    // Derived from variants on save, so listings can filter and sort with indexes.
    priceMin: { type: Number, default: 0, index: true },
    priceMax: { type: Number, default: 0 },
    // The cheapest variant's original price, so price and discount describe one variant.
    compareAtPrice: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0, index: true },
    totalStock: { type: Number, default: 0 },

    ratingAvg: { type: Number, default: 0, index: true },
    ratingCount: { type: Number, default: 0 },
    soldCount: { type: Number, default: 0, index: true },
  },
  { timestamps: true },
);

productSchema.index({ status: 1, category: 1, priceMin: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ 'variants.sku': 1 }, { unique: true });
productSchema.index({ createdAt: -1 });

productSchema.pre('validate', function () {
  const variants = this.variants ?? [];
  if (variants.length === 0) return;
  const prices = variants.map((variant) => variant.price);
  const cheapest = variants.reduce((low, variant) => (variant.price < low.price ? variant : low));
  this.priceMin = Math.min(...prices);
  this.priceMax = Math.max(...prices);
  this.compareAtPrice = cheapest.compareAtPrice ?? cheapest.price;
  this.totalStock = variants.reduce((sum, variant) => sum + variant.stock, 0);
  this.discountPercent =
    this.compareAtPrice > this.priceMin
      ? Math.round(((this.compareAtPrice - this.priceMin) / this.compareAtPrice) * 100)
      : 0;
});

export type ProductAttrs = InferSchemaType<typeof productSchema>;
export type ProductDoc = HydratedDocument<ProductAttrs>;
export const Product = model('Product', productSchema);
