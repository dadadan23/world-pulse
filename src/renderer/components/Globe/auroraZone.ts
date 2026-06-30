import type { AuroraEvent } from '@shared/types';

/** Map event severity (0-10 scale) to the polar-disc opacity range from PRD R5.2 (0.05-0.3). */
export function auroraZoneOpacity(severity: number): number {
  const normalized = Math.max(0, Math.min(10, severity)) / 10;
  return 0.05 + normalized * 0.25;
}

/** Resolve which pole(s) an aurora event's disc should render at. */
export function auroraHemispheres(
  hemisphere: AuroraEvent['data']['hemisphere']
): ('north' | 'south')[] {
  return hemisphere === 'both' ? ['north', 'south'] : [hemisphere];
}
