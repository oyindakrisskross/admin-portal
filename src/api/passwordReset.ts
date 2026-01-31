import api from "./client";

export async function requestPasswordReset(email: string) {
  const res = await api.post("/api/auth/password-reset/request", { email });
  return res.data as { detail?: string };
}

export async function confirmPasswordReset(params: {
  uid: string;
  token: string;
  new_password1: string;
  new_password2: string;
}) {
  const res = await api.post("/api/auth/password-reset/confirm", params);
  return res.data as { detail?: string };
}

