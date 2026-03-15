type Props = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export default function EmptyState({
  title = 'No events to display',
  description = "We're not receiving any live events right now.",
  onRetry,
}: Props) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center p-6">
        <div className="w-14 h-14 mx-auto mb-4 border border-ob-border rounded-full flex items-center justify-center animate-pulse-slow">
          <div className="w-6 h-6 border-t border-r border-ob-cyan animate-spin" />
        </div>
        <h3 className="ob-heading text-sm mb-2">{title}</h3>
        <p className="ob-label text-ob-text-dim mb-4">{description}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ob-label px-4 py-2 border border-ob-cyan text-ob-cyan hover:bg-ob-cyan/10 transition-colors"
          >
            RETRY
          </button>
        )}
      </div>
    </div>
  );
}
