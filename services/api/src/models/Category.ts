import mongoose, { Schema, type Types } from 'mongoose';
import { localizedSchema, type LocalizedAttrs } from './shared.js';

export interface CategoryAttrs {
  slug: string;
  name: LocalizedAttrs;
  description: LocalizedAttrs;
  sortOrder: number;
  active: boolean;
  _id: Types.ObjectId;
}

const categorySchema = new Schema<CategoryAttrs>(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: localizedSchema, required: true },
    description: { type: localizedSchema, required: true },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
categorySchema.index({ active: 1, sortOrder: 1 });

export const Category = mongoose.model<CategoryAttrs>('Category', categorySchema);
