type SegBarColor = 'cyan' | 'amber' | 'danger' | 'success';

interface SegBarProps {
  total: number;
  filled: number;
  color: SegBarColor;
}

/** Mission-control style segmented bar: a row of discrete filled/unfilled cells. */
export function SegBar({ total, filled, color }: SegBarProps) {
  const clampedFilled = Math.max(0, Math.min(total, Math.round(filled)));

  return (
    <div className="ob-seg-bar">
      {Array.from({ length: total }, (_, i) => {
        const isFilled = i < clampedFilled;
        return (
          <div
            key={i}
            className={
              isFilled
                ? `ob-seg-bar-cell ob-seg-bar-cell-filled ob-seg-bar-cell-filled-${color}`
                : 'ob-seg-bar-cell'
            }
            style={isFilled ? { animationDelay: `${i * 20}ms` } : undefined}
          />
        );
      })}
    </div>
  );
}
