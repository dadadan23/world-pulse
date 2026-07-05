import { useEffect, useState } from 'react';

/**
 * Portrait is defined by aspect ratio, not device width, per DESIGN.md's
 * "Responsive Layout" addendum -- a width threshold would conflate "small
 * screen" with "portrait orientation" and World Pulse never targets phones.
 */
const PORTRAIT_QUERY = '(orientation: portrait)';

/**
 * Whether the viewport is currently in portrait orientation. Updates live on
 * rotation via the media query's `change` event, so layout re-flows without
 * a page reload.
 */
export function useOrientation(): boolean {
  const [isPortrait, setIsPortrait] = useState(() => window.matchMedia(PORTRAIT_QUERY).matches);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(PORTRAIT_QUERY);
    const handleChange = (event: MediaQueryListEvent) => setIsPortrait(event.matches);

    mediaQueryList.addEventListener('change', handleChange);
    return () => mediaQueryList.removeEventListener('change', handleChange);
  }, []);

  return isPortrait;
}
