// src/api/location.ts

import api from "./client";
import { buildQueryPath } from "./query";
import type { PaginatedResult } from "./types";
import * as Location from "../types/location";
import type { FilterSet } from "../types/filters";



export async function fetchOutlets(): Promise<Location.Outlet[]> {
  const res = await api.get("/api/locations/outlets/")
  return res.data;
}


export async function fetchPortals(params?: Record<string, any>) {
  const res = await api.get<PaginatedResult<Location.Location>>("/api/locations/", {
    params,
  });
  return res.data;
}

export async function fetchLocations(params?: { filters?:FilterSet }) {
  const res = await api.get(
    buildQueryPath("/api/locations/", {
      filters: params?.filters,
    })
  );
  return res.data;
}

export async function fetchLocation(id: number) {
  const res = await api.get<Location.Location>(`/api/locations/${id}/`);
  return res.data;
}

export async function createLocation(payload: Location.Location) {
  const res = await api.post<Location.Location>("/api/locations/", payload);
  return res.data;
}

export async function updateLocation(id: number, patch: Location.Location) {
  const res = await api.patch(`/api/locations/${id}/`, patch);
  return res.data;
}

export async function deleteLocation(id: number) {
  await api.delete(`/api/locations/${id}/`);
}
