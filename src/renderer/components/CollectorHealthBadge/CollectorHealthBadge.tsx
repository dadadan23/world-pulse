import type { CollectorHealthStatus } from '@shared/types';
import StatusBadge from '../StatusBadge/StatusBadge';

type Props = {
  name: string;
  status: CollectorHealthStatus;
  errorCount?: number;
};

const DOT_CLASSES: Record<CollectorHealthStatus, string> = {
  healthy: 'bg-ob-success ob-glow',
  degraded: 'bg-ob-amber',
  disabled: 'bg-ob-danger',
};

const BADGE_STATE: Record<CollectorHealthStatus, 'nominal' | 'warning' | 'critical'> = {
  healthy: 'nominal',
  degraded: 'warning',
  disabled: 'critical',
};

const STATUS_LABELS: Record<CollectorHealthStatus, string> = {
  healthy: 'LIVE',
  degraded: 'DEGRADED',
  disabled: 'DISABLED',
};

export function CollectorHealthBadge({ name, status, errorCount }: Props) {
  const title =
    errorCount != null && errorCount > 0
      ? `${errorCount} error${errorCount !== 1 ? 's' : ''}`
      : undefined;

  return (
    <div className="flex items-center justify-between w-full" title={title}>
      <span className="ob-label text-ob-text">{name.toUpperCase()}</span>
      <div className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${DOT_CLASSES[status]}`} />
        <StatusBadge state={BADGE_STATE[status]}>{STATUS_LABELS[status]}</StatusBadge>
      </div>
    </div>
  );
}

export default CollectorHealthBadge;
