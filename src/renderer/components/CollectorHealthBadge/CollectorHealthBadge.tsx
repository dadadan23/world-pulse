type Status = 'healthy' | 'degraded' | 'disabled';

type Props = {
  name: string;
  status: Status;
  reason?: string | null;
};

function statusColor(status: Status): string {
  if (status === 'healthy') return 'bg-ob-success';
  if (status === 'degraded') return 'bg-ob-amber';
  return 'bg-ob-danger';
}

export default function CollectorHealthBadge({ name, status, reason }: Props) {
  return (
    <div className="inline-flex items-center gap-2" title={reason ?? undefined}>
      <span className={`w-2.5 h-2.5 rounded-full ${statusColor(status)}`} />
      <span className="text-ob-text text-xs">{name}</span>
      <span className="ob-label text-ob-text-dim ml-2">{status}</span>
    </div>
  );
}
