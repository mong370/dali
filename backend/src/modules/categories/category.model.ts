import { Schema, model, type InferSchemaType } from 'mongoose';

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    // Materialized path: every ancestor id, so a subtree is a single indexed query.
    ancestors: { type: [{ type: Schema.Types.ObjectId, ref: 'Category' }], default: [], index: true },
    icon: { type: String, default: '🛍️' },
    image: { type: String },
    sortOrder: { type: Number, default: 0 },
    showInNav: { type: Boolean, default: false },
    // Shows a card of this category's products at the bottom of the homepage.
    homeShowcase: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type CategoryAttrs = InferSchemaType<typeof categorySchema>;
export const Category = model('Category', categorySchema);
