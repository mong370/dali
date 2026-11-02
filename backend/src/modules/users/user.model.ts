import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const addressSchema = new Schema({
  label: { type: String, default: 'Home', trim: true },
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  district: { type: String, required: true, trim: true },
  area: { type: String, required: true, trim: true },
  line1: { type: String, required: true, trim: true },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer', index: true },
    isActive: { type: Boolean, default: true },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, trim: true },
    addresses: { type: [addressSchema], default: [] },
    wishlist: { type: [{ type: Schema.Types.ObjectId, ref: 'Product' }], default: [] },
    passwordResetHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  { timestamps: true },
);

export type UserAttrs = InferSchemaType<typeof userSchema>;
export type UserDoc = HydratedDocument<UserAttrs>;
export const User = model('User', userSchema);
