/**
 * Renderer-layer runtime configuration.
 * All environment variables consumed by the frontend are centralised here so
 * that changes to env var names or defaults only need to be made in one place.
 */

/** Base URL of the World Pulse backend server. */
export const SERVER_URL: string = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
