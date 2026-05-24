import type { CountryBoundarySource } from './textureRenderer';
import { parseGeoJsonBoundaries } from './geoJsonParser';
import boundaryGeoJson from './ne_110m_admin_0_boundary_lines_land.geojson';

/**
 * Pre-parsed Natural Earth 110m admin-0 boundary lines.
 * Processed once at module load time so globe texture generation stays fast.
 */
const NE_110M_BOUNDARIES = parseGeoJsonBoundaries(boundaryGeoJson).map((entry) => ({
  points: entry.points,
  style: entry.style,
}));

if (NE_110M_BOUNDARIES.length === 0) {
  console.warn(
    '[world-pulse] ne110mBoundarySource: boundary dataset parsed to 0 polylines. ' +
      'Country boundary rendering will be disabled. ' +
      'Ensure geojsonPlugin() is registered and ' +
      'ne_110m_admin_0_boundary_lines_land.geojson is valid.'
  );
}

/** CountryBoundarySource backed by Natural Earth admin-0 boundary lines. */
export const ne110mBoundarySource: CountryBoundarySource = () => NE_110M_BOUNDARIES;
