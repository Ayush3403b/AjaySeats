import mongoose, { Schema } from 'mongoose';

/** Atomic sequence store, used for human-readable inquiry references. */
const counterSchema = new Schema<{ _id: string; seq: number }>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false },
);

export const Counter = mongoose.model<{ _id: string; seq: number }>('Counter', counterSchema);
