export const SAFE_SPECIAL_CHARS = "!@#$%^&*()-_=+[]{}:,.?";

export function validatePortalPassword(pwd: string): string | null {
  if ((pwd ?? "").length < 8) return "Password must be at least 8 characters.";
  if (/\s/.test(pwd)) return "Password must not contain spaces.";

  const allowed = new RegExp(
    `^[A-Za-z0-9${SAFE_SPECIAL_CHARS.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}]+$`
  );
  if (!allowed.test(pwd)) {
    return `Password contains unsupported characters. Allowed special characters: ${SAFE_SPECIAL_CHARS}`;
  }

  if (!/[a-z]/.test(pwd)) return "Password must include at least 1 lowercase letter.";
  if (!/[A-Z]/.test(pwd)) return "Password must include at least 1 uppercase letter.";
  if (!/[0-9]/.test(pwd)) return "Password must include at least 1 number.";
  if (!new RegExp(`[${SAFE_SPECIAL_CHARS.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}]`).test(pwd)) {
    return `Password must include at least 1 special character (${SAFE_SPECIAL_CHARS}).`;
  }
  return null;
}

export function validateStaffPin(pin: string): string | null {
  if (!/^[0-9]{6}$/.test(pin ?? "")) return "Password must be a 6-digit numeric PIN for staff users.";
  return null;
}

