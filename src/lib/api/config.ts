/** Backend API root including `/api/v1`. */
export const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api/v1").replace(/\/$/, "");

export const AUTH_STORAGE_KEY = "spx-farm-os-tokens";
