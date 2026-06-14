import type { HistoricalContextRecord } from '@shared/types';

// ---------------------------------------------------------------------------
// Geo-index
// ---------------------------------------------------------------------------

export interface GeoIndex {
  records: HistoricalContextRecord[];
}

const MIN_GEO_CONFIDENCE = 0.5;
const EARTH_RADIUS_KM = 6371;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(a));
}

/**
 * Build a searchable geo-index from a set of historical records.
 * Records below MIN_GEO_CONFIDENCE are excluded as geospatially unreliable.
 */
export function buildGeoIndex(records: HistoricalContextRecord[]): GeoIndex {
  return { records: records.filter((r) => r.confidence >= MIN_GEO_CONFIDENCE) };
}

/**
 * Return all records within `radiusKm` of the given coordinates, sorted by
 * ascending distance so the closest match appears first.
 */
export function queryByRadius(
  index: GeoIndex,
  lat: number,
  lon: number,
  radiusKm: number
): HistoricalContextRecord[] {
  return index.records
    .map((r) => ({
      record: r,
      distanceKm: haversineKm(lat, lon, r.location.lat, r.location.lon),
    }))
    .filter(({ distanceKm }) => distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .map(({ record }) => record);
}

// ---------------------------------------------------------------------------
// Curated v1 dataset
// ---------------------------------------------------------------------------

// Fixed timestamp so tests remain deterministic regardless of when they run.
const INGESTED_AT = 1_718_000_000_000;

const CURATED_RECORDS: HistoricalContextRecord[] = [
  // ── Shipwrecks ──────────────────────────────────────────────────────────
  {
    id: 'wreck-titanic-1912',
    title: 'RMS Titanic Sinking',
    category: 'transport',
    subCategory: 'shipwreck',
    location: { lat: 41.73, lon: -49.95, name: 'North Atlantic Ocean' },
    date: '1912-04-15',
    summary:
      'The RMS Titanic struck an iceberg on her maiden voyage and sank, killing over 1,500 of the 2,224 aboard — one of the deadliest peacetime maritime disasters in history.',
    source: { name: 'Wreck Site Database', license: 'CC-BY-4.0' },
    confidence: 0.98,
    isSensitive: false,
    ingestedAt: INGESTED_AT,
  },
  {
    id: 'wreck-lusitania-1915',
    title: 'RMS Lusitania Torpedoed',
    category: 'conflict',
    subCategory: 'shipwreck',
    location: { lat: 51.42, lon: -8.53, name: 'Old Head of Kinsale, Ireland' },
    date: '1915-05-07',
    summary:
      'A German U-boat torpedoed the British liner RMS Lusitania off the Irish coast, killing 1,198 passengers and crew. The sinking contributed to shifting US opinion toward entering WWI.',
    source: { name: 'Naval History and Heritage Command', license: 'CC0-1.0' },
    confidence: 0.97,
    isSensitive: true,
    ingestedAt: INGESTED_AT,
  },
  {
    id: 'wreck-bismarck-1941',
    title: 'Battleship Bismarck Sunk',
    category: 'conflict',
    subCategory: 'shipwreck',
    location: { lat: 48.1, lon: -16.2, name: 'North Atlantic' },
    date: '1941-05-27',
    summary:
      'The German battleship Bismarck was sunk by Royal Navy forces after a three-day pursuit. Over 2,100 crew perished. She had sunk HMS Hood two days earlier.',
    source: { name: 'WWII Naval Records Archive', license: 'CC0-1.0' },
    confidence: 0.95,
    isSensitive: true,
    ingestedAt: INGESTED_AT,
  },
  {
    id: 'wreck-andrea-doria-1956',
    title: 'SS Andrea Doria Collision',
    category: 'transport',
    subCategory: 'shipwreck',
    location: { lat: 40.49, lon: -69.85, name: 'Nantucket, Massachusetts' },
    date: '1956-07-25',
    summary:
      'The Italian liner SS Andrea Doria collided with MS Stockholm in heavy fog south of Nantucket and sank, killing 46 people. The accident became a landmark in maritime safety reform.',
    source: { name: 'Wreck Site Database', license: 'CC-BY-4.0' },
    confidence: 0.92,
    isSensitive: false,
    ingestedAt: INGESTED_AT,
  },
  {
    id: 'wreck-mary-rose-1545',
    title: 'Mary Rose Capsizes',
    category: 'transport',
    subCategory: 'shipwreck',
    location: { lat: 50.77, lon: -1.1, name: 'Solent, England' },
    date: '1545-07-19',
    summary:
      'The Tudor warship Mary Rose capsized in the Solent while engaging a French fleet, with hundreds of crew lost. She was raised in 1982 and is now preserved in Portsmouth.',
    source: { name: 'Mary Rose Trust', license: 'CC-BY-4.0' },
    confidence: 0.88,
    isSensitive: false,
    ingestedAt: INGESTED_AT,
  },
  {
    id: 'wreck-vasa-1628',
    title: 'Swedish Warship Vasa Sinks',
    category: 'transport',
    subCategory: 'shipwreck',
    location: { lat: 59.33, lon: 18.06, name: 'Stockholm harbour, Sweden' },
    date: '1628-08-10',
    summary:
      "The heavily armed Swedish warship Vasa capsized and sank on her maiden voyage after sailing less than 1,400 metres. She was salvaged in 1961 and is now the world's best-preserved 17th-century ship.",
    source: { name: 'Vasa Museum, Stockholm', license: 'CC-BY-4.0' },
    confidence: 0.96,
    isSensitive: false,
    ingestedAt: INGESTED_AT,
  },

  // ── Major Battles ────────────────────────────────────────────────────────
  {
    id: 'battle-hastings-1066',
    title: 'Battle of Hastings',
    category: 'conflict',
    subCategory: 'battle',
    location: { lat: 50.91, lon: 0.49, name: 'Hastings, East Sussex, England' },
    date: '1066-10-14',
    summary:
      "William the Conqueror's Norman forces defeated King Harold II, reshaping English history, language, and culture. Harold was killed during the battle.",
    source: { name: 'UK Historic Environment Record', license: 'OGL-3.0' },
    confidence: 0.93,
    isSensitive: false,
    ingestedAt: INGESTED_AT,
  },
  {
    id: 'battle-waterloo-1815',
    title: 'Battle of Waterloo',
    category: 'conflict',
    subCategory: 'battle',
    location: { lat: 50.68, lon: 4.41, name: 'Waterloo, Belgium' },
    date: '1815-06-18',
    summary:
      "Wellington's allied forces and Prussian troops under Blücher decisively defeated Napoleon Bonaparte, ending the Napoleonic Wars and Napoleon's Hundred Days return to power.",
    source: { name: 'Belgian Heritage Institute', license: 'CC-BY-4.0' },
    confidence: 0.97,
    isSensitive: false,
    ingestedAt: INGESTED_AT,
  },
  {
    id: 'battle-somme-1916',
    title: 'Battle of the Somme',
    category: 'conflict',
    subCategory: 'battle',
    location: { lat: 50.0, lon: 2.7, name: 'Somme, Northern France' },
    date: '1916-07-01',
    era: 'World War I',
    summary:
      "One of WWI's largest battles, with over one million casualties across five months. July 1, 1916 remains the bloodiest single day in British Army history.",
    source: { name: 'Commonwealth War Graves Commission', license: 'CC-BY-4.0' },
    confidence: 0.96,
    isSensitive: true,
    ingestedAt: INGESTED_AT,
  },
  {
    id: 'battle-midway-1942',
    title: 'Battle of Midway',
    category: 'conflict',
    subCategory: 'battle',
    location: { lat: 28.2, lon: -177.35, name: 'Midway Atoll, Pacific Ocean' },
    date: '1942-06-04',
    era: 'World War II',
    summary:
      'A decisive US naval victory in the Pacific. American forces sank four Japanese aircraft carriers, turning the tide of the war in the Pacific Theatre.',
    source: { name: 'Naval History and Heritage Command', license: 'CC0-1.0' },
    confidence: 0.97,
    isSensitive: true,
    ingestedAt: INGESTED_AT,
  },
  {
    id: 'battle-gettysburg-1863',
    title: 'Battle of Gettysburg',
    category: 'conflict',
    subCategory: 'battle',
    location: { lat: 39.81, lon: -77.23, name: 'Gettysburg, Pennsylvania, USA' },
    date: '1863-07-01',
    era: 'American Civil War',
    summary:
      'The largest battle of the American Civil War, resulting in a Union victory that halted the Confederate invasion of the North. Over 50,000 soldiers were killed, wounded, or went missing.',
    source: { name: 'US National Park Service', license: 'CC0-1.0' },
    confidence: 0.98,
    isSensitive: true,
    ingestedAt: INGESTED_AT,
  },
  {
    id: 'battle-thermopylae-480bc',
    title: 'Battle of Thermopylae',
    category: 'conflict',
    subCategory: 'battle',
    location: { lat: 38.8, lon: 22.5, name: 'Thermopylae, Greece' },
    era: 'Classical Antiquity (~480 BC)',
    summary:
      "Leonidas I led 300 Spartans and allied Greeks in a last stand against Xerxes' Persian army at the pass of Thermopylae. Their sacrifice delayed the Persian advance and became a symbol of heroic resistance.",
    source: { name: 'Greek Cultural Heritage Database', license: 'CC-BY-4.0' },
    confidence: 0.75,
    isSensitive: false,
    ingestedAt: INGESTED_AT,
  },
  {
    id: 'battle-stalingrad-1942',
    title: 'Battle of Stalingrad',
    category: 'conflict',
    subCategory: 'battle',
    location: { lat: 48.7, lon: 44.5, name: 'Volgograd (Stalingrad), Russia' },
    date: '1942-08-23',
    era: 'World War II',
    summary:
      'One of the deadliest battles in history. The Soviet defense and counterattack at Stalingrad halted the German advance into the USSR, with estimated casualties exceeding 800,000 on both sides.',
    source: { name: 'Russian State Military Archive', license: 'CC-BY-4.0' },
    confidence: 0.94,
    isSensitive: true,
    ingestedAt: INGESTED_AT,
  },

  // ── Notable Disasters ────────────────────────────────────────────────────
  {
    id: 'disaster-earthquake-sf-1906',
    title: '1906 San Francisco Earthquake',
    category: 'disaster',
    subCategory: 'earthquake',
    location: { lat: 37.77, lon: -122.42, name: 'San Francisco, California' },
    date: '1906-04-18',
    summary:
      "A magnitude 7.9 earthquake and subsequent fires destroyed much of San Francisco, killing an estimated 3,000 people and leaving half the city's population homeless.",
    source: { name: 'USGS Earthquake Hazards Program', license: 'CC0-1.0' },
    confidence: 0.99,
    isSensitive: false,
    ingestedAt: INGESTED_AT,
  },
  {
    id: 'disaster-earthquake-lisbon-1755',
    title: '1755 Lisbon Earthquake and Tsunami',
    category: 'disaster',
    subCategory: 'earthquake',
    location: { lat: 38.72, lon: -9.14, name: 'Lisbon, Portugal' },
    date: '1755-11-01',
    summary:
      "A catastrophic earthquake followed by fires and a tsunami devastated Lisbon on All Saints' Day, killing an estimated 30,000–40,000 people and prompting Enlightenment debates on natural evil.",
    source: { name: 'Portuguese National Library', license: 'CC-BY-4.0' },
    confidence: 0.85,
    isSensitive: false,
    ingestedAt: INGESTED_AT,
  },
  {
    id: 'disaster-volcano-krakatoa-1883',
    title: '1883 Krakatoa Eruption',
    category: 'disaster',
    subCategory: 'volcano',
    location: { lat: -6.1, lon: 105.42, name: 'Krakatoa, Sunda Strait, Indonesia' },
    date: '1883-08-27',
    summary:
      'The 1883 eruption of Krakatoa produced one of the loudest sounds in recorded history. The caldera collapse triggered tsunamis that killed over 36,000 people across the surrounding coastlines.',
    source: { name: 'Smithsonian Global Volcanism Program', license: 'CC0-1.0' },
    confidence: 0.96,
    isSensitive: false,
    ingestedAt: INGESTED_AT,
  },
  {
    id: 'disaster-earthquake-kanto-1923',
    title: '1923 Great Kanto Earthquake',
    category: 'disaster',
    subCategory: 'earthquake',
    location: { lat: 35.45, lon: 139.3, name: 'Kanto region, Japan' },
    date: '1923-09-01',
    summary:
      "A magnitude 7.9 earthquake struck the Kanto plain, triggering fires that swept through Tokyo and Yokohama. Over 100,000 people died, making it Japan's deadliest natural disaster of the 20th century.",
    source: { name: 'Japan Meteorological Agency Historical Records', license: 'CC0-1.0' },
    confidence: 0.97,
    isSensitive: false,
    ingestedAt: INGESTED_AT,
  },
];

/**
 * Load the curated v1 historical dataset.
 * Records below the minimum geo-confidence threshold are excluded at this stage.
 */
export function loadCuratedDataset(): HistoricalContextRecord[] {
  return CURATED_RECORDS.filter((r) => r.confidence >= MIN_GEO_CONFIDENCE);
}
