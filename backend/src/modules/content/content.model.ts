import { Schema, model } from 'mongoose';

const bannerSchema = new Schema(
  {
    placement: { type: String, enum: ['hero'], default: 'hero', index: true },
    eyebrow: { type: String, default: '' },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '' },
    image: { type: String, required: true },
    link: { type: String, default: '/products' },
    cta: { type: String, default: 'Shop now' },
    // Hero banners only: e.g. "From ৳1,700" badge. Poisha; 0 hides the badge.
    fromPrice: { type: Number, default: 0 },
    dark: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Banner = model('Banner', bannerSchema);
