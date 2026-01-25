// src/api/profile.ts

import api from "./client";

export type MeResponse = {
  user: any;
  permissions: any;
  allowed_location_ids?: number[];
};

export async function fetchMyProfile() {
  const res = await api.get<MeResponse>("/api/auth/me");
  return res.data.user;
}

export async function updateMyProfile(payload: {
  first_name?: string;
  last_name?: string;
  phone?: string;
}) {
  const res = await api.patch<MeResponse>("/api/auth/me", payload);
  return res.data.user;
}

export async function changeMyPassword(payload: {
  current_password: string;
  new_password1: string;
  new_password2: string;
}) {
  const res = await api.post<{ detail: string }>("/api/auth/password-change", payload);
  return res.data;
}

export async function uploadMyProfileImage(file: File) {
  const fd = new FormData();
  fd.append("image", file);
  const res = await api.post<MeResponse>("/api/auth/me/image", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.user;
}

