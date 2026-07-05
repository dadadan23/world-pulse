interface SeverityPulseBadgeProps {
  severity: number;
}

/**
 * Compact numeric + text severity badge for high-severity ticker rows.
 * Reuses the existing `.ob-status-critical` class (criticalPulse keyframe,
 * already used by StatusBadge/connection status) rather than a new animation.
 * Always paired with the row's other severity indicators -- never the sole
 * signal of criticality.
 */
export function SeverityPulseBadge({ severity }: SeverityPulseBadgeProps) {
  return (
    <span className="ob-label ob-status-critical shrink-0" style={{ padding: '1px 6px' }}>
      {severity.toFixed(1)} CRIT
    </span>
  );
}
