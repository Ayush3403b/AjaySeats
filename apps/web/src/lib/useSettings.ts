import { useEffect, useState } from 'react';
import { api, type PublicSettings } from '../api/index.js';

const FALLBACK: PublicSettings = { whatsappNumber: null, currency: 'INR', languages: ['en', 'hi'] };
let cache: Promise<PublicSettings> | null = null;

/** Public settings are fetched once per visit. A failure leaves WhatsApp links hidden (never fake). */
export function useSettings(): PublicSettings {
  const [settings, setSettings] = useState<PublicSettings>(FALLBACK);
  useEffect(() => {
    cache ??= api.getSettings().catch(() => FALLBACK);
    let active = true;
    void cache.then((value) => active && setSettings(value));
    return () => {
      active = false;
    };
  }, []);
  return settings;
}
