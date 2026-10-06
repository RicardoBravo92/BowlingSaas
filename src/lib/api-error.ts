/**
 * Extract a user-safe message from an axios/FastAPI error.
 * FastAPI 422 responses return `detail` as an array of validation objects;
 * rendering those directly would crash React, so only pass through strings.
 */
export const apiErrorMessage = (err: unknown, fallback: string): string => {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === 'string' && detail.length > 0 ? detail : fallback;
};