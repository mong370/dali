import { Schema, model, type InferSchemaType } from 'mongoose';

const couponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    type: { type: String, enum: ['percent', 'fixed', 'free_shipping'], required: true },
    // A percentage for 'percent', poisha for 'fixed'; unused for 'free_shipping'.
    value: { type: Number, default: 0, min: 0 },
    // Upper limit in poisha for 'percent' and 'free_shipping'; 0 means no limit.
    maxDiscount: { type: Number, default: 0, min: 0 },
    minSubtotal: { type: Number, default: 0, min: 0 },
    firstOrderOnly: { type: Boolean, default: false },
    usageLimit: { type: Number, default: 0, min: 0 }, // 0 means unlimited
    usedCount: { type: Number, default: 0, min: 0 },
    startsAt: { type: Date },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type CouponAttrs = InferSchemaType<typeof couponSchema>;
export const Coupon = model('Coupon', couponSchema);
