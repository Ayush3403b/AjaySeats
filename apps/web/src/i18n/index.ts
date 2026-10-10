import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import hi from './locales/hi.json';

export const SUPPORTED_LANGUAGES = ['en', 'hi'] as const;
export type UiLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = 'pcs-lang';

export function isUiLanguage(value: unknown): value is UiLanguage {
  return value === 'en' || value === 'hi';
}

/** Precedence: ?lang= in the URL, then the saved choice, then English. See docs/i18n.md. */
export function resolveInitialLanguage(search: string, stored: string | null): UiLanguage {
  const fromUrl = new URLSearchParams(search).get('lang');
  if (isUiLanguage(fromUrl)) return fromUrl;
  if (isUiLanguage(stored)) return stored;
  return 'en';
}

export function readStoredLanguage(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function applyLanguage(lng: UiLanguage): void {
  void i18n.changeLanguage(lng);
  try {
    window.localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    /* storage unavailable (private mode): the choice still applies for this session */
  }
  document.documentElement.lang = lng;
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
  },
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
  interpolation: { escapeValue: false },
  returnNull: false,
  react: { useSuspense: false },
});

export default i18n;
