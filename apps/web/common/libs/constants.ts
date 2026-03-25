/**
 * Public routes that don't require authentication
 */
export const PUBLIC_ROUTES = ['/login', '/signup'];

/**
 * Mock mode — enabled during static GitHub Pages build.
 * Set NEXT_PUBLIC_USE_MOCK=true at build time (see build:gh script).
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
export const MOCK_ME_URL = `${BASE}/mocks/me.json`;
export const MOCK_DASHBOARD_URL = `${BASE}/mocks/transaction.json`;

/**
 * API configuration.
 * In the browser we use a same-origin proxy (/api → backend) so that
 * httpOnly cookies are set on the same origin and are never blocked
 * as third-party cookies by the browser.
 * Server-side (SSR/RSC) we still need the full URL.
 */
export const API_URL =
  typeof window === 'undefined'
    ? process.env.BACKEND_URL || 'http://localhost:3001'
    : '/api';

/**
 * The real backend origin (scheme + host + port).
 * Used ONLY for validating the `event.origin` of postMessages sent from
 * the OAuth popup — the popup window lives at this origin, not at /api.
 * Must match the GOOGLE_REDIRECT_URI host.
 */
export const BACKEND_ORIGIN =
  process.env.NEXT_PUBLIC_BACKEND_ORIGIN || 'http://localhost:3001';
