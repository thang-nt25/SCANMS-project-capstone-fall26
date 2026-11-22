import { ForbiddenException } from '@nestjs/common';

export function isAllowedFrontendOrigin(
  origin: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!origin) return true;
  const normalized = origin.replace(/\/$/, '');
  const configured = [env.CORS_ORIGINS, env.FRONTEND_URL]
    .flatMap((value) => (value || '').split(','))
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);
  if (configured.includes(normalized)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) return true;
  // Android Emulator aliases the development computer as 10.0.2.2.
  // Deployed frontends must be explicitly configured above.
  return env.NODE_ENV !== 'production' &&
    /^http:\/\/10\.0\.2\.2(:\d+)?$/.test(normalized);
}

export function frontendCorsOrigin(
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
) {
  if (isAllowedFrontendOrigin(origin)) return callback(null, true);
  callback(new ForbiddenException('Frontend origin is not allowed'), false);
}
