export type ThemeMode = 'dark' | 'light';
const STORAGE_KEY = 'pcs-theme';

/** Dark is the default. Reads the saved choice, falling back to the OS preference only if nothing was saved. */
export function readTheme(): ThemeMode {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* storage blocked */
  }
  return 'dark';
}

export function applyTheme(mode: ThemeMode): void {
  document.documentElement.setAttribute('data-theme', mode);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', mode === 'dark' ? '#0B1020' : '#F7F8FC');
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}
