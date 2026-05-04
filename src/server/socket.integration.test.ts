import { describe, it, expect, afterEach } from 'vitest';
import { io as Client, Socket } from 'socket.io-client';
import { createApp } from './app';
import type { Event } from '@shared/types';

interface EventPayload {
  events: Array<{
    id: string;
    timestamp: number;
    type: string;
    source: string;
    location: null | Record<string, unknown>;
    title: string;
    data: Record<string, unknown>;
  }>;
  timestamp: number;
}

/** Helper: create a minimal valid Event */
function makeSocketEvent(id: string, overrides: Partial<Event> = {}): Event {
  return {
    id,
    timestamp: Date.now(),
    type: 'earthquake',
    source: 'USGS Earthquake Hazards Program',
    location: null,
    title: `Event ${id}`,
    data: {},
    ...overrides,
  };
}

/** Helper: start app on ephemeral port and return URL + port */
async function startApp(app: ReturnType<typeof createApp>): Promise<string> {
  await new Promise<void>((resolve) => {
    app.httpServer.listen(0, () => resolve());
  });
  const addr = app.httpServer.address() as { port: number } | null;
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  return `http://127.0.0.1:${port}`;
}

/** Helper: wait for a socket event with a timeout */
function waitForEvent(socket: Socket, event: string, timeoutMs = 2000): Promise<EventPayload> {
  return new Promise<EventPayload>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`no ${event} within ${timeoutMs}ms`)),
      timeoutMs
    );
    socket.once(event, (payload: EventPayload) => {
      clearTimeout(timeout);
      resolve(payload);
    });
  });
}

describe('Socket.io integration', () => {
  let app: ReturnType<typeof createApp>;
  let clientSocket: Socket | null = null;

  afterEach(() => {
    try {
      clientSocket?.disconnect();
    } catch (_e) {
      // Ignore cleanup errors
    }
    app?.httpServer.close();
    app?.io.close();
  });

  it('emits events:initial on connect and events:new when server adds events', async () => {
    app = createApp({ corsOrigin: '*' });
    const url = await startApp(app);

    clientSocket = Client(url, { transports: ['websocket'] });

    const initial = await waitForEvent(clientSocket, 'events:initial');

    expect(initial).toBeDefined();
    expect(Array.isArray(initial.events)).toBe(true);

    // Now add events on server and expect events:new
    const newEvent = makeSocketEvent('socket-test-1');

    const newPayload = await new Promise<EventPayload>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('no events:new')), 2000);
      clientSocket?.once('events:new', (payload: EventPayload) => {
        clearTimeout(timeout);
        resolve(payload);
      });
      app.addEvents([newEvent]);
    });

    expect(newPayload).toBeDefined();
    expect(Array.isArray(newPayload.events)).toBe(true);
    expect(newPayload.events[0].id).toBe('socket-test-1');
  });

  it('events:initial payload schema: timestamp is a number and events array matches Event shape', async () => {
    app = createApp({ corsOrigin: '*' });
    // Pre-populate cache before client connects
    const preEvent = makeSocketEvent('pre-cache-1', {
      type: 'earthquake',
      source: 'USGS Earthquake Hazards Program',
      location: { lat: 35.7, lon: 139.7, name: 'Tokyo' },
      severity: 5,
      title: 'M5.0 - Near Tokyo',
      data: { magnitude: 5.0 },
    });
    app.addEvents([preEvent]);

    const url = await startApp(app);
    clientSocket = Client(url, { transports: ['websocket'] });

    const initial = await waitForEvent(clientSocket, 'events:initial');

    // timestamp must be a numeric Unix ms value
    expect(typeof initial.timestamp).toBe('number');
    expect(initial.timestamp).toBeGreaterThan(0);

    // Pre-existing events must be delivered on connect
    expect(initial.events.length).toBeGreaterThanOrEqual(1);
    const ev = initial.events.find((e) => e.id === 'pre-cache-1');
    expect(ev).toBeDefined();

    // Validate Event schema fields
    expect(typeof ev!.id).toBe('string');
    expect(typeof ev!.timestamp).toBe('number');
    expect(typeof ev!.type).toBe('string');
    expect(typeof ev!.source).toBe('string');
    expect(typeof ev!.title).toBe('string');
    expect(ev!.data).toBeDefined();
    // location is GeoLocation | null
    if (ev!.location !== null) {
      expect(typeof (ev!.location as Record<string, unknown>).lat).toBe('number');
      expect(typeof (ev!.location as Record<string, unknown>).lon).toBe('number');
    }
  });

  it('events:initial delivers empty events array when cache is empty', async () => {
    app = createApp({ corsOrigin: '*' });
    const url = await startApp(app);
    clientSocket = Client(url, { transports: ['websocket'] });

    const initial = await waitForEvent(clientSocket, 'events:initial');

    expect(Array.isArray(initial.events)).toBe(true);
    expect(initial.events).toHaveLength(0);
    expect(typeof initial.timestamp).toBe('number');
  });

  it('events:new payload schema: timestamp is numeric and events match Event shape', async () => {
    app = createApp({ corsOrigin: '*' });
    const url = await startApp(app);
    clientSocket = Client(url, { transports: ['websocket'] });

    // Wait for initial handshake
    await waitForEvent(clientSocket, 'events:initial');

    const newEvent = makeSocketEvent('schema-test-1', {
      type: 'earthquake',
      source: 'USGS Earthquake Hazards Program',
      location: { lat: -33.9, lon: 151.2, name: 'Sydney' },
      severity: 3,
      data: { magnitude: 3.1 },
    });

    const newPayload = await new Promise<EventPayload>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('no events:new')), 2000);
      clientSocket?.once('events:new', (payload: EventPayload) => {
        clearTimeout(timeout);
        resolve(payload);
      });
      app.addEvents([newEvent]);
    });

    expect(typeof newPayload.timestamp).toBe('number');
    expect(newPayload.timestamp).toBeGreaterThan(0);
    expect(Array.isArray(newPayload.events)).toBe(true);
    expect(newPayload.events).toHaveLength(1);

    const ev = newPayload.events[0];
    expect(ev.id).toBe('schema-test-1');
    expect(typeof ev.id).toBe('string');
    expect(typeof ev.timestamp).toBe('number');
    expect(typeof ev.type).toBe('string');
    expect(typeof ev.source).toBe('string');
    expect(typeof ev.title).toBe('string');
    expect(ev.data).toBeDefined();
  });

  it('emits events:new exactly once per addEvents call (no double-emit)', async () => {
    app = createApp({ corsOrigin: '*' });
    const url = await startApp(app);
    clientSocket = Client(url, { transports: ['websocket'] });

    // Wait for initial connection
    await waitForEvent(clientSocket, 'events:initial');

    // Count how many times events:new fires
    let emitCount = 0;
    clientSocket.on('events:new', () => {
      emitCount++;
    });

    app.addEvents([makeSocketEvent('double-emit-test')]);

    // Wait enough time for any duplicate emit to arrive
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(emitCount).toBe(1);
  });

  it('incremental delivery: multiple addEvents calls each emit one events:new', async () => {
    app = createApp({ corsOrigin: '*' });
    const url = await startApp(app);
    clientSocket = Client(url, { transports: ['websocket'] });

    await waitForEvent(clientSocket, 'events:initial');

    const received: EventPayload[] = [];
    clientSocket.on('events:new', (payload: EventPayload) => {
      received.push(payload);
    });

    app.addEvents([makeSocketEvent('incr-1')]);
    app.addEvents([makeSocketEvent('incr-2')]);
    app.addEvents([makeSocketEvent('incr-3')]);

    // Wait for all three emissions
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(received).toHaveLength(3);
    expect(received[0].events[0].id).toBe('incr-1');
    expect(received[1].events[0].id).toBe('incr-2');
    expect(received[2].events[0].id).toBe('incr-3');
  });
});
