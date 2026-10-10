import type { LocalizedText } from '@pcs/shared';

/** Colour options offered in the colour picker and quote form. Codes are stored lowercase. */
export const COLOUR_OPTIONS: Array<{ id: string; name: LocalizedText; code: string }> = [
  { id: 'black', name: { en: 'Black', hi: 'काला' }, code: '#1f1f1f' },
  { id: 'tan', name: { en: 'Tan', hi: 'टैन' }, code: '#8b5a2b' },
  { id: 'brown', name: { en: 'Brown', hi: 'भूरा' }, code: '#5b3a29' },
  { id: 'ivory', name: { en: 'Ivory', hi: 'आइवरी' }, code: '#f5f0e1' },
  { id: 'grey', name: { en: 'Grey', hi: 'ग्रे' }, code: '#6b7280' },
  { id: 'blue', name: { en: 'Blue', hi: 'नीला' }, code: '#1d4ed8' },
  { id: 'red', name: { en: 'Red', hi: 'लाल' }, code: '#b91c1c' },
];
