import type { CoastlineSource } from './textureRenderer';
import { parseGeoJsonCoastlines } from './geoJsonParser';
import coastlineGeoJson from './ne_110m_coastline.geojson';

/**
 * Pre-parsed Natural Earth 110m coastline data.
 * Processed once at module load time (build-time import via Vite JSON plugin)
 * so that createEarthTextures() incurs no parsing overhead at render time.
 */
const NE_110M_COASTLINES = parseGeoJsonCoastlines(coastlineGeoJson);

/**
 * CoastlineSource backed by Natural Earth 110m real-world coastline data.
 *
 * Swap the GeoJSON import above to change the data source without touching
 * any rendering code (data-source abstraction from #56).
 *
 * Usage:
 *   import { ne110mCoastlineSource } from './geoJsonCoastlineSource';
 *   createEarthTextures(ne110mCoastlineSource);
 */
export const ne110mCoastlineSource: CoastlineSource = () => NE_110M_COASTLINES;
