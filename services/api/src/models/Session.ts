import mongoose, { Schema, type HydratedDocument, type Types } from 'mongoose';

export interface SessionAttrs {
  tokenHash: string;
  userId: Types.ObjectId;
  csrfToken: string;
  expiresAt: Date;
}

const sessionSchema = new Schema<SessionAttrs>(
  {
    tokenHash: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    csrfToken: { type: String, required: true },
    /** TTL index: MongoDB removes expired sessions automatically. */
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true },
);

export type SessionDoc = HydratedDocument<SessionAttrs>;
export const Session = mongoose.model<SessionAttrs>('Session', sessionSchema);
