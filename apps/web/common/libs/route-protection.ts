import { PUBLIC_ROUTES } from './constants';

/** Determine if a route is public (no auth required) */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/** Return a redirect path if needed, or null if the user may proceed */
export function getRedirectDestination(
  isAuthenticated: boolean,
  pathname: string,
): string | null {
  if (isAuthenticated && isPublicRoute(pathname)) return '/';
  if (!isAuthenticated && !isPublicRoute(pathname)) return '/login';
  return null;
}
