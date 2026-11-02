import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'returned'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
};

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Prevents a double-clicked or retried checkout from creating two orders.
    idempotencyKey: { type: String, required: true },
    // Snapshots: orders must not change when products are later edited.
    items: [
      new Schema({
        product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        variant: { type: Schema.Types.ObjectId, required: true },
        name: { type: String, required: true },
        slug: { type: String, required: true },
        image: { type: String },
        sku: { type: String, required: true },
        options: { type: Map, of: String, default: {} },
        unitPrice: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
        lineTotal: { type: Number, required: true },
      }),
    ],
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      district: { type: String, required: true },
      area: { type: String, required: true },
      line1: { type: String, required: true },
    },
    subtotal: { type: Number, required: true },
    shippingFee: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    couponCode: { type: String },
    paymentMethod: { type: String, enum: ['cod'], default: 'cod' },
    paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },
    statusHistory: [
      new Schema(
        {
          status: { type: String, enum: ORDER_STATUSES, required: true },
          note: String,
          at: { type: Date, default: Date.now },
        },
        { _id: false },
      ),
    ],
    note: { type: String, default: '' },
  },
  { timestamps: true },
);

orderSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });

export type OrderAttrs = InferSchemaType<typeof orderSchema>;
export type OrderDoc = HydratedDocument<OrderAttrs>;
export const Order = model('Order', orderSchema);
