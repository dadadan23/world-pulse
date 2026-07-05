import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { AsteroidCollector } from './asteroids';

vi.mock('axios');

const mockAxiosGet = vi.mocked(axios.get);

const validResponse = {
  data: {
    element_count: 1,
    near_earth_objects: {
      '2026-06-27': [
        {
          id: '54321',
          neo_reference_id: '54321',
          name: '(2026 AB)',
          absolute_magnitude_h: 20.5,
          estimated_diameter: {
            meters: { estimated_diameter_min: 50, estimated_diameter_max: 110 },
          },
          is_potentially_hazardous_asteroid: false,
          close_approach_data: [
            {
              close_approach_date: '2026-06-27',
              close_approach_date_full: '2026-Jun-27 12:00',
              epoch_date_close_approach: 1782561600000,
              relative_velocity: { kilometers_per_hour: '25000' },
              miss_distance: { kilometers: '500000', lunar: '1.3' },
              orbiting_body: 'Earth',
            },
          ],
        },
      ],
    },
  },
};

describe('AsteroidCollector', () => {
  let collector: AsteroidCollector;

  beforeEach(() => {
    vi.clearAllMocks();
    collector = new AsteroidCollector();
  });

  it('returns asteroid events on a successful fetch', async () => {
    mockAxiosGet.mockResolvedValueOnce(validResponse);
    const events = await collector.fetch();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('asteroid');
    expect(events[0].title).toContain('2026 AB');
  });

  it('returns empty array on 429 (rate-limited) without throwing', async () => {
    const rateLimitError = Object.assign(new Error('Request failed with status code 429'), {
      isAxiosError: true,
      response: { status: 429 },
    });
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    mockAxiosGet.mockRejectedValueOnce(rateLimitError);

    await expect(collector.fetch()).resolves.toEqual([]);
  });

  it('re-throws non-429 errors', async () => {
    const networkError = Object.assign(new Error('Network Error'), {
      isAxiosError: true,
      response: { status: 500 },
    });
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    mockAxiosGet.mockRejectedValueOnce(networkError);

    await expect(collector.fetch()).rejects.toThrow('Network Error');
  });

  it('validate returns true for well-formed response', () => {
    expect(collector.validate(validResponse.data)).toBe(true);
  });

  it('validate returns false for null', () => {
    expect(collector.validate(null)).toBe(false);
  });

  it('throws when the response fails validation', async () => {
    mockAxiosGet.mockResolvedValueOnce({ data: { element_count: 'not-a-number' } });
    await expect(collector.fetch()).rejects.toThrow('Invalid response from NASA NeoWs');
  });

  it('sorts multiple asteroids by ascending miss distance', async () => {
    const multiResponse = {
      data: {
        element_count: 2,
        near_earth_objects: {
          '2026-06-27': [
            {
              ...validResponse.data.near_earth_objects['2026-06-27'][0],
              id: 'far',
              name: '(2026 FAR)',
              close_approach_data: [
                {
                  ...validResponse.data.near_earth_objects['2026-06-27'][0].close_approach_data[0],
                  miss_distance: { kilometers: '900000', lunar: '2.3' },
                },
              ],
            },
          ],
          '2026-06-28': [
            {
              ...validResponse.data.near_earth_objects['2026-06-27'][0],
              id: 'near',
              name: '(2026 NEAR)',
              close_approach_data: [
                {
                  ...validResponse.data.near_earth_objects['2026-06-27'][0].close_approach_data[0],
                  miss_distance: { kilometers: '100000', lunar: '0.3' },
                },
              ],
            },
          ],
        },
      },
    };
    mockAxiosGet.mockResolvedValueOnce(multiResponse);
    const events = await collector.fetch();
    expect(events.map((e) => e.title)).toEqual(['Asteroid 2026 NEAR', 'Asteroid 2026 FAR']);
  });

  it('assigns mid-range severity for a 1-5 lunar distance approach', async () => {
    const midRangeResponse = {
      data: {
        element_count: 1,
        near_earth_objects: {
          '2026-06-27': [
            {
              ...validResponse.data.near_earth_objects['2026-06-27'][0],
              close_approach_data: [
                {
                  ...validResponse.data.near_earth_objects['2026-06-27'][0].close_approach_data[0],
                  miss_distance: { kilometers: '1200000', lunar: '3.1' },
                },
              ],
            },
          ],
        },
      },
    };
    mockAxiosGet.mockResolvedValueOnce(midRangeResponse);
    const events = await collector.fetch();
    expect(events[0].severity).toBeGreaterThan(0);
  });

  it('assigns max severity for a close, large, hazardous asteroid', async () => {
    const hazardousResponse = {
      data: {
        element_count: 1,
        near_earth_objects: {
          '2026-06-27': [
            {
              ...validResponse.data.near_earth_objects['2026-06-27'][0],
              is_potentially_hazardous_asteroid: true,
              estimated_diameter: {
                meters: { estimated_diameter_min: 800, estimated_diameter_max: 1500 },
              },
              close_approach_data: [
                {
                  ...validResponse.data.near_earth_objects['2026-06-27'][0].close_approach_data[0],
                  miss_distance: { kilometers: '50000', lunar: '0.13' },
                },
              ],
            },
          ],
        },
      },
    };
    mockAxiosGet.mockResolvedValueOnce(hazardousResponse);
    const events = await collector.fetch();
    expect(events[0].severity).toBe(10);
  });

  it('assigns low severity for a 5-10 lunar distance approach', async () => {
    const midFarResponse = {
      data: {
        element_count: 1,
        near_earth_objects: {
          '2026-06-27': [
            {
              ...validResponse.data.near_earth_objects['2026-06-27'][0],
              close_approach_data: [
                {
                  ...validResponse.data.near_earth_objects['2026-06-27'][0].close_approach_data[0],
                  miss_distance: { kilometers: '3000000', lunar: '7.8' },
                },
              ],
            },
          ],
        },
      },
    };
    mockAxiosGet.mockResolvedValueOnce(midFarResponse);
    const events = await collector.fetch();
    expect(events[0].severity).toBeGreaterThan(0);
  });

  it('assigns mid-tier severity for a 500-1000m diameter asteroid', async () => {
    const midDiameterResponse = {
      data: {
        element_count: 1,
        near_earth_objects: {
          '2026-06-27': [
            {
              ...validResponse.data.near_earth_objects['2026-06-27'][0],
              estimated_diameter: {
                meters: { estimated_diameter_min: 400, estimated_diameter_max: 700 },
              },
            },
          ],
        },
      },
    };
    mockAxiosGet.mockResolvedValueOnce(midDiameterResponse);
    const events = await collector.fetch();
    expect(events[0].severity).toBeGreaterThan(0);
  });

  it('skips a NEO with no close-approach data', async () => {
    const noApproachResponse = {
      data: {
        element_count: 1,
        near_earth_objects: {
          '2026-06-27': [
            {
              ...validResponse.data.near_earth_objects['2026-06-27'][0],
              close_approach_data: [],
            },
          ],
        },
      },
    };
    mockAxiosGet.mockResolvedValueOnce(noApproachResponse);
    await expect(collector.fetch()).resolves.toEqual([]);
  });

  it('assigns zero severity for a distant, small, non-hazardous asteroid', async () => {
    const farResponse = {
      data: {
        element_count: 1,
        near_earth_objects: {
          '2026-06-27': [
            {
              ...validResponse.data.near_earth_objects['2026-06-27'][0],
              estimated_diameter: {
                meters: { estimated_diameter_min: 5, estimated_diameter_max: 20 },
              },
              close_approach_data: [
                {
                  ...validResponse.data.near_earth_objects['2026-06-27'][0].close_approach_data[0],
                  miss_distance: { kilometers: '10000000', lunar: '26' },
                },
              ],
            },
          ],
        },
      },
    };
    mockAxiosGet.mockResolvedValueOnce(farResponse);
    const events = await collector.fetch();
    expect(events[0].severity).toBe(0);
  });
});
