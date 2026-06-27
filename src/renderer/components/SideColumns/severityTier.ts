export type SeverityTier = 'danger' | 'amber' | 'cyan';

/** Maps a 0-10 severity value to the tier used for seg-bar / readout coloring. */
export function severityTier(severity: number): SeverityTier {
  if (severity >= 7) return 'danger';
  if (severity >= 4) return 'amber';
  return 'cyan';
}
