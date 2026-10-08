export type Theme = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'scanms-theme';

export function getSavedTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#181511' : '#FAF8F5');
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme);
}

export function saveTheme(theme: Theme) {
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Switching still works when the browser disallows persistent storage.
  }
}
