import { useAppStore } from '../../store/useAppStore';

/**
 * PrimaryDegradedBanner - Amber warning banner when any primary-tier data source
 * is not healthy (degraded or disabled). Hidden when all primary sources are healthy.
 */
export function PrimaryDegradedBanner() {
  const serverStatus = useAppStore((state) => state.serverStatus);

  if (!serverStatus) return null;

  const degradedPrimary = serverStatus.collectors.filter(
    (c) => c.qualityTier === 'primary' && c.status !== 'healthy'
  );

  if (degradedPrimary.length === 0) return null;

  const names = degradedPrimary.map((c) => c.name).join(', ');

  return (
    <div
      className="fixed top-0 left-0 right-0 z-40 pointer-events-none flex justify-center"
      role="alert"
      aria-live="polite"
    >
      <div className="ob-banner ob-banner-warning" data-testid="primary-degraded-banner">
        <div className="flex items-center gap-3">
          <div
            className="w-2 h-2 rounded-full bg-ob-accent-amber animate-pulse-slow motion-reduce:animate-none"
            aria-hidden="true"
          />
          <span className="ob-label tracking-ultrawide">PRIMARY SOURCE UNAVAILABLE: {names}</span>
        </div>
      </div>
    </div>
  );
}
