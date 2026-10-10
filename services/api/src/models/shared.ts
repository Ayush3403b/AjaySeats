import { Schema } from 'mongoose';

export interface LocalizedAttrs {
  en: string;
  hi: string;
}

/** Bilingual text. Hindi may be empty; the API falls back to English for display. */
export const localizedSchema = new Schema<LocalizedAttrs>(
  {
    en: { type: String, required: true, trim: true, maxlength: 2000 },
    hi: { type: String, default: '', trim: true, maxlength: 2000 },
  },
  { _id: false },
);
