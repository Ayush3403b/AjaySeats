import { describe, expect, it } from 'vitest';
import { campaignFormSchema, campaignServerPathToField, toCampaignPayload } from './campaignForm.js';

const valid = { name: '  Monsoon offer  ', language: 'hi' as const, message: '  नमस्ते {name}, हमारा ऑफ़र देखें।  ', city: '  ' };

describe('campaign form', () => {
  it('accepts a valid draft and trims text', () => {
    expect(campaignFormSchema.safeParse(valid).success).toBe(true);
  });

  it('sends an empty city as null, meaning all cities', () => {
    const payload = toCampaignPayload(valid);
    expect(payload.city).toBeNull();
    expect(payload.name).toBe('Monsoon offer');
    expect(payload.message.startsWith('नमस्ते {name}')).toBe(true);
  });

  it('keeps a city when one is given', () => {
    expect(toCampaignPayload({ ...valid, city: ' Patna ' }).city).toBe('Patna');
  });

  it('rejects a one-letter city and a too-short message', () => {
    const r = campaignFormSchema.safeParse({ ...valid, city: 'P' });
    expect(r.success).toBe(false);
    const m = campaignFormSchema.safeParse({ ...valid, message: 'short' });
    expect(m.success).toBe(false);
  });

  it('maps only the four known API fields onto the form', () => {
    expect(campaignServerPathToField('message')).toBe('message');
    expect(campaignServerPathToField('counts.eligible')).toBeNull();
  });
});
