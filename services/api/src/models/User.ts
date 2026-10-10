import mongoose, { Schema, type HydratedDocument } from 'mongoose';

export interface UserAttrs {
  name: string;
  email: string;
  passwordHash: string;
  role: 'owner' | 'staff';
  active: boolean;
  loginAt?: Date;
}

const userSchema = new Schema<UserAttrs>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 200 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['owner', 'staff'], default: 'staff' },
    active: { type: Boolean, default: true },
    loginAt: { type: Date },
  },
  { timestamps: true },
);

export type UserDoc = HydratedDocument<UserAttrs>;
export const User = mongoose.model<UserAttrs>('User', userSchema);
