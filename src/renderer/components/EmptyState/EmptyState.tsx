type Props = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export default function EmptyState({
  title = 'Waiting for world events...',
  description = "We're not receiving any live events right now.",
  onRetry,
}: Props) {
  return (
    <div className="ob-panel ob-panel-active p-6">
      <div className="ob-panel-inner flex flex-col items-center justify-center text-center">
        {/* Pulse animation indicator - respects prefers-reduced-motion */}
        <div className="w-12 h-12 mb-6 border border-ob-border flex items-center justify-center ob-glow">
          <div
            className="w-4 h-4 border-t border-r border-ob-cyan"
            style={{ transform: 'rotate(45deg)' }}
          />
        </div>

        <h3 className="ob-heading text-sm mb-3 text-ob-text">{title}</h3>
        <p className="ob-label text-ob-text-dim max-w-[28ch]">{description}</p>

        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-6 ob-label px-5 py-2 border border-ob-cyan text-ob-cyan hover:border-ob-border-active hover:text-ob-text ob-transition-fade cursor-pointer"
          >
            [ RETRY ]
          </button>
        )}
      </div>
    </div>
  );
}
