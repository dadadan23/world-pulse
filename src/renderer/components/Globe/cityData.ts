/**
 * Major city coordinates for globe labels.
 * Organized into tiers based on visibility importance.
 */

export interface CityData {
  name: string; // 3-letter city code for compact display
  fullName: string; // Full city name
  lat: number;
  lon: number;
  tier: 1 | 2 | 3;
}

/**
 * City visibility tiers:
 * - Tier 1: Always visible (10 major capitals/global cities)
 * - Tier 2: Visible when zoomed (camera distance < 3.5) (20 large cities)
 * - Tier 3: Visible only when nearby event is featured (30 regional cities)
 */
export const CITIES: CityData[] = [
  // TIER 1: Always visible (10 cities) - Major global capitals
  { name: 'NYC', fullName: 'New York', lat: 40.71, lon: -74.01, tier: 1 },
  { name: 'LON', fullName: 'London', lat: 51.51, lon: -0.13, tier: 1 },
  { name: 'TYO', fullName: 'Tokyo', lat: 35.68, lon: 139.69, tier: 1 },
  { name: 'BJS', fullName: 'Beijing', lat: 39.9, lon: 116.4, tier: 1 },
  { name: 'PAR', fullName: 'Paris', lat: 48.86, lon: 2.35, tier: 1 },
  { name: 'BER', fullName: 'Berlin', lat: 52.52, lon: 13.4, tier: 1 },
  { name: 'SYD', fullName: 'Sydney', lat: -33.87, lon: 151.21, tier: 1 },
  { name: 'SAO', fullName: 'São Paulo', lat: -23.55, lon: -46.63, tier: 1 },
  { name: 'DXB', fullName: 'Dubai', lat: 25.2, lon: 55.27, tier: 1 },
  { name: 'TOR', fullName: 'Toronto', lat: 43.65, lon: -79.38, tier: 1 },

  // TIER 2: Visible when zoomed (20 cities) - Major regional centers
  { name: 'LAX', fullName: 'Los Angeles', lat: 34.05, lon: -118.24, tier: 2 },
  { name: 'MEX', fullName: 'Mexico City', lat: 19.43, lon: -99.13, tier: 2 },
  { name: 'BUE', fullName: 'Buenos Aires', lat: -34.6, lon: -58.38, tier: 2 },
  { name: 'RIO', fullName: 'Rio de Janeiro', lat: -22.91, lon: -43.17, tier: 2 },
  { name: 'CAI', fullName: 'Cairo', lat: 30.04, lon: 31.24, tier: 2 },
  { name: 'JNB', fullName: 'Johannesburg', lat: -26.2, lon: 28.05, tier: 2 },
  { name: 'MOS', fullName: 'Moscow', lat: 55.76, lon: 37.62, tier: 2 },
  { name: 'IST', fullName: 'Istanbul', lat: 41.01, lon: 28.98, tier: 2 },
  { name: 'DEL', fullName: 'New Delhi', lat: 28.61, lon: 77.21, tier: 2 },
  { name: 'MUM', fullName: 'Mumbai', lat: 19.08, lon: 72.88, tier: 2 },
  { name: 'SIN', fullName: 'Singapore', lat: 1.35, lon: 103.82, tier: 2 },
  { name: 'BKK', fullName: 'Bangkok', lat: 13.76, lon: 100.5, tier: 2 },
  { name: 'SEL', fullName: 'Seoul', lat: 37.57, lon: 126.98, tier: 2 },
  { name: 'SHA', fullName: 'Shanghai', lat: 31.23, lon: 121.47, tier: 2 },
  { name: 'HKG', fullName: 'Hong Kong', lat: 22.32, lon: 114.17, tier: 2 },
  { name: 'ROM', fullName: 'Rome', lat: 41.9, lon: 12.5, tier: 2 },
  { name: 'MAD', fullName: 'Madrid', lat: 40.42, lon: -3.7, tier: 2 },
  { name: 'AMS', fullName: 'Amsterdam', lat: 52.37, lon: 4.9, tier: 2 },
  { name: 'STO', fullName: 'Stockholm', lat: 59.33, lon: 18.07, tier: 2 },
  { name: 'WAR', fullName: 'Warsaw', lat: 52.23, lon: 21.01, tier: 2 },

  // TIER 3: Visible when nearby event is featured (30 cities) - Regional cities
  { name: 'CHI', fullName: 'Chicago', lat: 41.88, lon: -87.63, tier: 3 },
  { name: 'SFO', fullName: 'San Francisco', lat: 37.77, lon: -122.42, tier: 3 },
  { name: 'MIA', fullName: 'Miami', lat: 25.76, lon: -80.19, tier: 3 },
  { name: 'SEA', fullName: 'Seattle', lat: 47.61, lon: -122.33, tier: 3 },
  { name: 'VAN', fullName: 'Vancouver', lat: 49.28, lon: -123.12, tier: 3 },
  { name: 'LIM', fullName: 'Lima', lat: -12.05, lon: -77.04, tier: 3 },
  { name: 'BOG', fullName: 'Bogotá', lat: 4.71, lon: -74.07, tier: 3 },
  { name: 'SAN', fullName: 'Santiago', lat: -33.45, lon: -70.67, tier: 3 },
  { name: 'LIS', fullName: 'Lisbon', lat: 38.72, lon: -9.14, tier: 3 },
  { name: 'DUB', fullName: 'Dublin', lat: 53.35, lon: -6.26, tier: 3 },
  { name: 'VIE', fullName: 'Vienna', lat: 48.21, lon: 16.37, tier: 3 },
  { name: 'PRG', fullName: 'Prague', lat: 50.08, lon: 14.44, tier: 3 },
  { name: 'ATH', fullName: 'Athens', lat: 37.98, lon: 23.73, tier: 3 },
  { name: 'TEL', fullName: 'Tel Aviv', lat: 32.09, lon: 34.78, tier: 3 },
  { name: 'RUH', fullName: 'Riyadh', lat: 24.71, lon: 46.67, tier: 3 },
  { name: 'DOH', fullName: 'Doha', lat: 25.29, lon: 51.53, tier: 3 },
  { name: 'NAI', fullName: 'Nairobi', lat: -1.29, lon: 36.82, tier: 3 },
  { name: 'LOS', fullName: 'Lagos', lat: 6.52, lon: 3.38, tier: 3 },
  { name: 'KHI', fullName: 'Karachi', lat: 24.86, lon: 67.01, tier: 3 },
  { name: 'JAK', fullName: 'Jakarta', lat: -6.21, lon: 106.85, tier: 3 },
  { name: 'MNL', fullName: 'Manila', lat: 14.6, lon: 120.98, tier: 3 },
  { name: 'HAN', fullName: 'Hanoi', lat: 21.03, lon: 105.85, tier: 3 },
  { name: 'MEL', fullName: 'Melbourne', lat: -37.81, lon: 144.96, tier: 3 },
  { name: 'AKL', fullName: 'Auckland', lat: -36.85, lon: 174.76, tier: 3 },
  { name: 'OSL', fullName: 'Oslo', lat: 59.91, lon: 10.75, tier: 3 },
  { name: 'HEL', fullName: 'Helsinki', lat: 60.17, lon: 24.94, tier: 3 },
  { name: 'COP', fullName: 'Copenhagen', lat: 55.68, lon: 12.57, tier: 3 },
  { name: 'BRU', fullName: 'Brussels', lat: 50.85, lon: 4.35, tier: 3 },
];

/**
 * Get cities by tier for filtering
 */
export function getCitiesByTier(tier: 1 | 2 | 3): CityData[] {
  return CITIES.filter((city) => city.tier === tier);
}

/**
 * Get all cities up to a specific tier (inclusive)
 * e.g., getCitiesUpToTier(2) returns tier 1 and tier 2 cities
 */
export function getCitiesUpToTier(maxTier: 1 | 2 | 3): CityData[] {
  return CITIES.filter((city) => city.tier <= maxTier);
}
