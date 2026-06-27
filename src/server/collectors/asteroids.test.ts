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
});
