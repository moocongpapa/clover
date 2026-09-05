/**
 * CORS origin allow-list shared by HTTP and Socket.IO.
 *
 * Production origins must be declared explicitly in FRONTEND_URL.  Local
 * development hosts are accepted only outside production so that a similarly
 * named third-party Vercel project cannot receive credentialed CORS access.
 */
export function isAllowedOrigin(
  origin: string | undefined,
  frontendUrl: string | undefined,
  nodeEnv: string | undefined,
): boolean {
  if (!origin) return true;

  const configuredOrigins = (frontendUrl ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (configuredOrigins.includes(origin)) return true;

  if (nodeEnv === 'production') return false;

  return /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(
    origin,
  );
}
