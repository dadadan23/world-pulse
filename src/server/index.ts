import dotenv from 'dotenv';
import { createApp } from './app';
import { CollectorRegistry } from './collectors/registry';
import { EarthquakeCollector } from './collectors/earthquakes';
import { ISSCollector } from './collectors/iss';
import { AuroraCollector } from './collectors/aurora';
import { AsteroidCollector } from './collectors/asteroids';
import { VolcanoCollector } from './collectors/volcanoes';
import { PlanetCollector } from './collectors/planets';
import { WeatherCollector } from './collectors/weather';
import { HistoricalCollector } from './collectors/historical';
import { NewsCollector } from './collectors/news';
import type { CollectorManifest } from '@shared/types';

// Load environment variables — .env.local (gitignored, local dev) takes precedence over .env
dotenv.config({ path: '.env.local' });
dotenv.config();

const PORT = process.env.PORT || 3000;

const { httpServer, io, addEvents, setCollectors } = createApp({
  corsOrigin: process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173',
});

// ---------------------------------------------------------------------------
// Collector manifests - one per module, versioned and validated at startup.
// ---------------------------------------------------------------------------

const registry = new CollectorRegistry();

const manifests: {
  manifest: CollectorManifest;
  factory: () => InstanceType<
    | typeof EarthquakeCollector
    | typeof ISSCollector
    | typeof AuroraCollector
    | typeof AsteroidCollector
    | typeof VolcanoCollector
    | typeof PlanetCollector
    | typeof WeatherCollector
    | typeof HistoricalCollector
    | typeof NewsCollector
  >;
}[] = [
  {
    manifest: {
      id: 'earthquakes',
      version: '1.0.0',
      displayName: 'USGS Earthquake Hazards',
      capabilities: ['earthquake'],
      qualityTier: 'primary',
      enabledByDefault: true,
      description: 'Real-time earthquake data from the USGS Earthquake Hazards Program.',
      sourceUrl: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php',
    },
    factory: () => new EarthquakeCollector(),
  },
  {
    manifest: {
      id: 'iss',
      version: '1.0.0',
      displayName: 'ISS Tracker',
      capabilities: ['iss'],
      qualityTier: 'supplementary',
      enabledByDefault: true,
      description: 'Real-time International Space Station position.',
      sourceUrl: 'http://api.open-notify.org/iss-now.json',
    },
    factory: () => new ISSCollector(),
  },
  {
    manifest: {
      id: 'aurora',
      version: '1.0.0',
      displayName: 'NOAA Aurora Forecast',
      capabilities: ['aurora'],
      qualityTier: 'supplementary',
      enabledByDefault: true,
      description: 'Aurora borealis activity from NOAA Space Weather Prediction Center.',
      sourceUrl: 'https://services.swpc.noaa.gov/',
    },
    factory: () => new AuroraCollector(),
  },
  {
    manifest: {
      id: 'asteroids',
      version: '1.0.0',
      displayName: 'NASA Near-Earth Objects',
      capabilities: ['asteroid'],
      qualityTier: 'supplementary',
      enabledByDefault: true,
      description: 'Near-Earth asteroid close-approach data from NASA JPL.',
      sourceUrl: 'https://api.nasa.gov/neo/rest/v1/feed',
    },
    factory: () => new AsteroidCollector(),
  },
  {
    manifest: {
      id: 'volcanoes',
      version: '1.0.0',
      displayName: 'Volcano Discovery',
      capabilities: ['volcano'],
      qualityTier: 'primary',
      enabledByDefault: true,
      description: 'Active volcano eruption reports.',
      sourceUrl: 'https://www.volcanodiscovery.com/',
    },
    factory: () => new VolcanoCollector(),
  },
  {
    manifest: {
      id: 'planets',
      version: '1.0.0',
      displayName: 'Planet Visibility',
      capabilities: ['planet'],
      qualityTier: 'supplementary',
      enabledByDefault: true,
      description: 'Nightly visibility data for planets observable from Earth.',
    },
    factory: () => new PlanetCollector(),
  },
  {
    manifest: {
      id: 'weather',
      version: '1.0.0',
      displayName: 'OpenWeatherMap',
      capabilities: ['weather'],
      qualityTier: 'primary',
      enabledByDefault: true,
      description: 'Current conditions and forecast from OpenWeatherMap.',
      sourceUrl: 'https://openweathermap.org/',
      requiredEnvVars: ['OPENWEATHER_API_KEY'],
    },
    factory: () => new WeatherCollector(),
  },
  {
    manifest: {
      id: 'historical',
      version: '1.0.0',
      displayName: 'Historical Geo-Context',
      capabilities: ['historical'],
      qualityTier: 'supplementary',
      enabledByDefault: true,
      description: 'Curated historical events (shipwrecks, battles) for globe enrichment.',
    },
    factory: () => new HistoricalCollector(),
  },
  {
    manifest: {
      id: 'news',
      version: '1.0.0',
      displayName: 'Global Headlines',
      capabilities: ['news'],
      qualityTier: 'primary',
      enabledByDefault: true,
      description: 'Global top headline news from NewsAPI.',
      sourceUrl: 'https://newsapi.org/',
      requiredEnvVars: ['NEWSAPI_KEY'],
    },
    factory: () => new NewsCollector(),
  },
];

for (const { manifest, factory } of manifests) {
  try {
    registry.register(manifest, factory);
  } catch (err) {
    console.error(`[Server] Failed to register collector "${manifest.id}":`, err);
  }
}

// Start server
httpServer.listen(PORT, () => {
  console.warn(`[Server] Running on http://localhost:${PORT}`);
  console.warn(`[Socket.io] WebSocket server ready`);

  const collectors = registry.start((events) => {
    addEvents(events);
  });

  setCollectors(collectors);

  // Wire disable notifications
  for (const c of collectors) {
    c.onDisabled = (reason?: string) => {
      console.warn(`[Server] Collector disabled: ${c.name} (${reason || 'unknown'})`);
      try {
        io.emit('collector:disabled', {
          name: c.name,
          reason: reason || null,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.warn('[Server] Failed to emit collector:disabled', err);
      }
    };
  }

  console.warn(`[Server] ${collectors.length} collectors started`);
});

// Graceful shutdown
function shutdown(signal: string) {
  console.warn(`[Server] ${signal} received, shutting down gracefully`);
  registry.stop();
  httpServer.close(() => {
    console.warn('[Server] HTTP server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  console.error('[Server] Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled rejection:', reason);
});
