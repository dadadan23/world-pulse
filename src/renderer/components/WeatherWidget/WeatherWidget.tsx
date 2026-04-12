import { useAppStore } from '../../store/useAppStore';
import type { WeatherEvent, ForecastDay, PlanetEvent } from '@shared/types';

// Map OpenWeatherMap condition codes to a simple display symbol
function conditionSymbol(code: number): string {
  if (code >= 200 && code < 300) return '⛈';
  if (code >= 300 && code < 400) return '🌦';
  if (code >= 500 && code < 600) return '🌧';
  if (code >= 600 && code < 700) return '❄';
  if (code >= 700 && code < 800) return '≈';
  if (code === 800) return '☀';
  if (code === 801) return '🌤';
  if (code >= 802) return '☁';
  return '?';
}

function shortDay(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
}

function moonPhaseSymbol(phase: number): string {
  if (phase < 0.03 || phase > 0.97) return '🌑';
  if (phase < 0.22) return '🌒';
  if (phase < 0.28) return '🌓';
  if (phase < 0.47) return '🌔';
  if (phase < 0.53) return '🌕';
  if (phase < 0.72) return '🌖';
  if (phase < 0.78) return '🌗';
  return '🌘';
}

function ForecastStrip({ days }: { days: ForecastDay[] }) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
      {days.map((day) => (
        <div
          key={day.date}
          className="flex flex-col items-center gap-0.5 p-1.5 bg-ob-bg-elevated/40 border border-ob-border/40 text-center"
        >
          <span className="ob-label text-ob-text-dim text-[10px]">{shortDay(day.date)}</span>
          <span className="text-sm leading-none">{conditionSymbol(day.conditionCode)}</span>
          <span className="ob-label text-ob-cyan text-[10px] tabular-nums">
            {Math.round(day.tempHigh)}°
          </span>
          <span className="ob-label text-ob-text-dim text-[10px] tabular-nums">
            {Math.round(day.tempLow)}°
          </span>
          {day.precipitation > 0 && (
            <span className="ob-label text-ob-text-dim text-[10px]">
              {day.precipitation.toFixed(1)}mm
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function WeatherWidget() {
  const { events } = useAppStore();

  const weatherEvent = events.find((e): e is WeatherEvent => e.type === 'weather');
  const moonEvent = events.find(
    (e): e is PlanetEvent => e.type === 'planet' && e.data.planetName === 'Moon'
  );

  if (!weatherEvent) {
    return (
      <div className="ob-panel p-3">
        <div className="ob-panel-inner p-2 flex items-center justify-center h-full min-h-[80px]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-t border-r border-ob-cyan animate-spin" />
            <span className="ob-label text-ob-text-dim">WEATHER LOADING</span>
          </div>
        </div>
      </div>
    );
  }

  const d = weatherEvent.data;
  const moonPhase = typeof moonEvent?.data.phase === 'number' ? moonEvent.data.phase : null;

  return (
    <div className="ob-panel p-3 flex flex-col gap-2">
      <div className="ob-panel-inner flex flex-col gap-2">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ob-border pb-2">
          <span className="ob-heading text-sm text-ob-text tracking-wide">WEATHER</span>
          <span className="ob-label text-ob-text-dim text-[10px] truncate max-w-[120px]">
            {d.locationName}
          </span>
        </div>

        {/* Current conditions */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl leading-none text-ob-cyan ob-text-glow tabular-nums">
                {Math.round(d.temperature)}°
              </span>
              <span className="ob-label text-ob-text-dim">C</span>
            </div>
            <span className="ob-label text-ob-text-dim text-[10px]">
              feels {Math.round(d.feelsLike)}°
            </span>
            <span className="ob-label text-ob-amber text-[10px]">
              {conditionSymbol(d.conditionCode)} {d.condition}
            </span>
          </div>

          <div className="flex flex-col gap-0.5 text-right">
            <span className="ob-label text-ob-text-dim text-[10px]">
              HUM <span className="text-ob-text">{d.humidity}%</span>
            </span>
            <span className="ob-label text-ob-text-dim text-[10px]">
              WIND <span className="text-ob-text">{d.windSpeed.toFixed(1)} m/s</span>
            </span>
            <span className="ob-label text-ob-text-dim text-[10px]">
              PRES <span className="text-ob-text">{d.pressure} hPa</span>
            </span>
          </div>
        </div>

        {/* Moon phase */}
        {moonPhase !== null && (
          <div className="flex items-center gap-2 border-t border-ob-border pt-2">
            <span className="text-base leading-none">{moonPhaseSymbol(moonPhase)}</span>
            <div className="flex flex-col gap-0">
              <span className="ob-label text-ob-text-dim text-[10px]">MOON</span>
              <span className="ob-label text-ob-text text-[10px]">
                {moonEvent?.title.replace('🌙 Moon - ', '')}
              </span>
            </div>
            <div className="flex-1 h-0.5 bg-ob-border rounded-full overflow-hidden">
              <div
                className="h-full bg-ob-cyan/50"
                style={{
                  width: `${Math.abs(Math.cos(moonPhase * 2 * Math.PI - Math.PI)) * 100}%`,
                }}
              />
            </div>
            <span className="ob-label text-ob-text-dim text-[10px] tabular-nums">
              {Math.round(Math.abs(Math.cos(moonPhase * 2 * Math.PI - Math.PI)) * 100)}%
            </span>
          </div>
        )}

        {/* 5-day forecast */}
        {d.forecast.length > 0 && (
          <div className="border-t border-ob-border pt-2">
            <span className="ob-label text-ob-text-dim text-[10px] block mb-1">5-DAY FORECAST</span>
            <ForecastStrip days={d.forecast} />
          </div>
        )}
      </div>
    </div>
  );
}
