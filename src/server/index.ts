import dotenv from 'dotenv';
import { createApp } from './app';
import { EarthquakeCollector } from './collectors/earthquakes';
import { ISSCollector } from './collectors/iss';
import { AuroraCollector } from './collectors/aurora';
import { AsteroidCollector } from './collectors/asteroids';
import { VolcanoCollector } from './collectors/volcanoes';
import { PlanetCollector } from './collectors/planets';
import { WeatherCollector } from './collectors/weather';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

const { httpServer, io, addEvents, setCollectors } = createApp({
  corsOrigin: process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173',
});

// Initialize all collectors
const collectors = [
  new EarthquakeCollector(),
  new ISSCollector(),
  new AuroraCollector(),
  new AsteroidCollector(),
  new VolcanoCollector(),
  new PlanetCollector(),
  new WeatherCollector(),
];

// Attach disable handlers so server can react and notify clients
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

setCollectors(collectors);

// Start collectors and emit events via Socket.io
function startCollectors() {
  console.warn('[Server] Starting data collectors...');

  for (const collector of collectors) {
    collector.start((events) => {
      addEvents(events);
      console.warn(`[Server] Emitted ${events.length} ${collector.type} events to clients`);
    });
  }
}

// Start server
httpServer.listen(PORT, () => {
  console.warn(`[Server] Running on http://localhost:${PORT}`);
  console.warn(`[Socket.io] WebSocket server ready`);
  console.warn(`[Server] ${collectors.length} collectors configured`);

  // Start collectors after server is running
  startCollectors();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.warn('[Server] SIGTERM received, shutting down gracefully');

  // Stop all collectors
  collectors.forEach((c) => c.stop());

  httpServer.close(() => {
    console.warn('[Server] HTTP server closed');
    process.exit(0);
  });
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('[Server] Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled rejection:', reason);
});
