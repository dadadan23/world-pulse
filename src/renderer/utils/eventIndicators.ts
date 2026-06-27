/** Get the display color and symbol for an event, based on type and severity. */
export function getEventIndicator(
  type: string,
  severity?: number
): { color: string; symbol: string } {
  // Color based on severity
  let color = 'text-ob-cyan';
  if (severity !== undefined) {
    if (severity >= 7) color = 'text-ob-danger';
    else if (severity >= 4) color = 'text-ob-amber';
  }

  // Symbol based on type
  const symbols: Record<string, string> = {
    earthquake: '◆', // diamond
    weather: '▲', // triangle
    news: '■', // square
    astronomy: '★', // star
    volcano: '△', // triangle up (hollow)
    iss: '⌂', // house/station
    aurora: '≈', // wavy lines
    asteroid: '✶', // six-pointed star
    planet: '○', // circle (hollow)
  };

  return { color, symbol: symbols[type] || '●' }; // default: circle
}
