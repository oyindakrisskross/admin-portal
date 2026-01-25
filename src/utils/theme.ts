export type Theme = "dark" | "light";

const THEME_KEY = "kk_theme";
export const DEFAULT_THEME: Theme = "dark";

export function themeScopeForUser(user: { id: number; portal?: number | null }) {
  return `user:${user.id}${user.portal != null ? `:portal:${user.portal}` : ""}`;
}

function keyForScope(scope?: string) {
  return scope ? `${THEME_KEY}:${scope}` : THEME_KEY;
}

export function getStoredTheme(scope?: string): Theme {
  const raw = (localStorage.getItem(keyForScope(scope)) || "").toLowerCase();
  if (raw === "light" || raw === "dark") return raw;
  return DEFAULT_THEME;
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function setStoredTheme(theme: Theme, scope?: string) {
  localStorage.setItem(keyForScope(scope), theme);
  applyTheme(theme);
}
