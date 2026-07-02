import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { WeatherWidget } from './WeatherWidget';
import { useAppStore } from '../../store/useAppStore';
import type { Event, WeatherEvent } from '@shared/types';

function makeWeatherData(overrides: Partial<WeatherEvent['data']> = {}): WeatherEvent['data'] {
  return {
    temperature: 21,
    feelsLike: 20,
    condition: 'Clear',
    conditionCode: 800,
    windSpeed: 2.5,
    humidity: 55,
    pressure: 1012,
    visibility: 10000,
    locationName: 'London, GB',
    forecast: [],
    ...overrides,
  };
}

function makeBroadcastWeatherEvent(overrides: Partial<WeatherEvent['data']> = {}): WeatherEvent {
  return {
    id: 'weather-local',
    timestamp: Date.now(),
    type: 'weather',
    source: 'OpenWeatherMap',
    location: { lat: 51.5, lon: -0.1, name: 'London, GB' },
    title: 'London: Clear 21°C',
    data: makeWeatherData(overrides),
  };
}

function mockFetchOnce(status: number, body: unknown) {
  return vi.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe('WeatherWidget', () => {
  beforeEach(() => {
    useAppStore.setState({
      events: [],
      selectedEvent: null,
      userLat: null,
      userLon: null,
      geolocationStatus: 'pending',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('shows the loading state when nothing is available yet', () => {
    render(<WeatherWidget />);
    expect(screen.getByText('WEATHER LOADING')).toBeInTheDocument();
  });

  it('renders the ambient broadcast weather event when no client/event location is active', () => {
    useAppStore.setState({ events: [makeBroadcastWeatherEvent({ locationName: 'Berlin, DE' })] });

    render(<WeatherWidget />);

    expect(screen.getByText('Berlin, DE')).toBeInTheDocument();
    expect(screen.getByText('21°')).toBeInTheDocument();
    expect(screen.queryByTestId('weather-event-badge')).not.toBeInTheDocument();
  });

  it('shows an unavailable message once the broadcast event never arrives', () => {
    vi.useFakeTimers();
    render(<WeatherWidget />);

    act(() => {
      vi.advanceTimersByTime(20_000);
    });

    expect(screen.getByTestId('weather-unavailable')).toBeInTheDocument();
    expect(screen.getByText('Unable to reach weather service')).toBeInTheDocument();
  });

  it('fetches weather for the client geolocation when granted', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetchOnce(200, { data: makeWeatherData({ locationName: 'Chicago, US' }) })
    );
    useAppStore.setState({ userLat: 41.8, userLon: -87.6, geolocationStatus: 'granted' });

    render(<WeatherWidget />);

    await waitFor(() => expect(screen.getByText('Chicago, US')).toBeInTheDocument());
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('lat=41.8'));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('lon=-87.6'));
  });

  it('switches to the selected event location and shows the event badge', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetchOnce(200, { data: makeWeatherData({ locationName: 'Tokyo, JP' }) })
    );
    const event: Event = {
      id: 'eq-1',
      timestamp: Date.now(),
      type: 'earthquake',
      source: 'USGS',
      location: { lat: 35.68, lon: 139.69, name: 'Tokyo, JP' },
      title: 'M5.0 - Near Tokyo',
      data: { magnitude: 5.0 },
    };
    useAppStore.setState({
      selectedEvent: event,
      userLat: 41.8,
      userLon: -87.6,
      geolocationStatus: 'granted',
    });

    render(<WeatherWidget />);

    await waitFor(() => expect(screen.getByText('Tokyo, JP')).toBeInTheDocument());
    expect(screen.getByTestId('weather-event-badge')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('lat=35.68'));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('name=Tokyo'));
  });

  it('shows a configuration message when the server reports the API key is missing', async () => {
    vi.stubGlobal('fetch', mockFetchOnce(503, { error: 'not_configured' }));
    useAppStore.setState({ userLat: 41.8, userLon: -87.6, geolocationStatus: 'granted' });

    render(<WeatherWidget />);

    await waitFor(() => expect(screen.getByTestId('weather-unavailable')).toBeInTheDocument());
    expect(screen.getByText('OpenWeatherMap API key not configured')).toBeInTheDocument();
  });

  it('shows a moon phase readout when a Moon planet event is present', () => {
    useAppStore.setState({
      events: [
        makeBroadcastWeatherEvent(),
        {
          id: 'planet-moon',
          timestamp: Date.now(),
          type: 'planet',
          source: 'Test',
          location: null,
          title: '\u{1F319} Moon - Full Moon',
          data: {
            planetName: 'Moon',
            constellation: 'N/A',
            magnitude: -12,
            altitude: 45,
            azimuth: 180,
            riseTime: '2026-07-01T18:00:00Z',
            setTime: '2026-07-02T06:00:00Z',
            phase: 0.5,
          },
        },
      ],
    });

    render(<WeatherWidget />);

    expect(screen.getByText('MOON')).toBeInTheDocument();
    expect(screen.getByText('Full Moon')).toBeInTheDocument();
  });

  it('omits the moon readout when no Moon planet event is present', () => {
    useAppStore.setState({ events: [makeBroadcastWeatherEvent()] });
    render(<WeatherWidget />);
    expect(screen.queryByText('MOON')).not.toBeInTheDocument();
  });

  it('renders a forecast strip with precipitation for rainy days and no precipitation label for dry days', () => {
    useAppStore.setState({
      events: [
        makeBroadcastWeatherEvent({
          conditionCode: 500,
          forecast: [
            {
              date: '2026-07-01',
              tempHigh: 22,
              tempLow: 14,
              conditionCode: 500,
              condition: 'Rain',
              precipitation: 3.2,
              windSpeed: 4.1,
            },
            {
              date: '2026-07-02',
              tempHigh: 25,
              tempLow: 16,
              conditionCode: 800,
              windSpeed: 2.3,
              condition: 'Clear',
              precipitation: 0,
            },
          ],
        }),
      ],
    });

    render(<WeatherWidget />);

    expect(screen.getByText('5-DAY FORECAST')).toBeInTheDocument();
    expect(screen.getByText('3.2mm')).toBeInTheDocument();
  });

  it('omits the forecast strip when no forecast days are available', () => {
    useAppStore.setState({ events: [makeBroadcastWeatherEvent({ forecast: [] })] });
    render(<WeatherWidget />);
    expect(screen.queryByText('5-DAY FORECAST')).not.toBeInTheDocument();
  });
});
