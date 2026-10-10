import { z } from 'zod';
import { LANGUAGES, type AdminCampaign, type CampaignCreateInput } from '@pcs/shared';

/** Form model for a draft campaign. The message may contain {name}, replaced per recipient by the API. */
export const campaignFormSchema = z.object({
  name: z.string().trim().min(3, 'admin.errors.campaignName').max(120, 'admin.errors.tooLong'),
  language: z.enum(LANGUAGES),
  message: z.string().trim().min(10, 'admin.errors.campaignMessage').max(600, 'admin.errors.tooLong'),
  city: z
    .string()
    .trim()
    .max(80, 'admin.errors.tooLong')
    .refine((v) => v === '' || v.length >= 2, 'admin.errors.cityShort'),
});

export type CampaignFormValues = z.infer<typeof campaignFormSchema>;

export function emptyCampaignForm(): CampaignFormValues {
  return { name: '', language: 'en', message: '', city: '' };
}

export function toCampaignFormValues(c: AdminCampaign): CampaignFormValues {
  return { name: c.name, language: c.language, message: c.message, city: c.city ?? '' };
}

export function toCampaignPayload(v: CampaignFormValues): CampaignCreateInput {
  return {
    name: v.name.trim(),
    language: v.language,
    message: v.message.trim(),
    city: v.city.trim() === '' ? null : v.city.trim(),
  };
}

/** Server paths map straight onto form fields. Anything else is shown as a general message. */
export function campaignServerPathToField(path: string): keyof CampaignFormValues | null {
  return (['name', 'language', 'message', 'city'] as const).find((f) => f === path) ?? null;
}
