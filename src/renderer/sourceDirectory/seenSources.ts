const STORAGE_KEY = 'world-pulse:seen-sources';

/**
 * Tracks which source collector names the user has already been shown,
 * so the "new source" HUD indicator only lights up for sources added
 * after the user's first visit rather than on every page load.
 */
export function getSeenSourceIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function markSourcesSeen(ids: string[]): void {
  try {
    const merged = new Set([...getSeenSourceIds(), ...ids]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...merged]));
  } catch {
    // localStorage unavailable (e.g. private browsing quota) -- non-fatal, indicator just won't persist
  }
}

/** True if any of the given collector names haven't been recorded as seen yet. */
export function hasUnseenSources(collectorNames: string[]): boolean {
  const seen = new Set(getSeenSourceIds());
  return collectorNames.some((name) => !seen.has(name));
}
