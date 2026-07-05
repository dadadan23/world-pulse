/**
 * Near-Earth Asteroid Collector
 * API: NASA NeoWs (Near Earth Object Web Service)
 * https://api.nasa.gov/neo
 *
 * Note: Uses DEMO_KEY by default. For production, set NASA_API_KEY env var.
 */

import axios from 'axios';
import type { Event, AsteroidEvent } from '@shared/types';
import { BaseCollector } from './base';

interface NeoWsNeoObject {
  id: string;
  neo_reference_id: string;
  name: string;
  absolute_magnitude_h: number;
  estimated_diameter: {
    meters: {
      estimated_diameter_min: number;
      estimated_diameter_max: number;
    };
  };
  is_potentially_hazardous_asteroid: boolean;
  close_approach_data: Array<{
    close_approach_date: string;
    close_approach_date_full: string;
    epoch_date_close_approach: number;
    relative_velocity: {
      kilometers_per_hour: string;
    };
    miss_distance: {
      kilometers: string;
      lunar: string;
    };
    orbiting_body: string;
  }>;
}

interface NeoWsResponse {
  element_count: number;
  near_earth_objects: {
    [date: string]: NeoWsNeoObject[];
  };
}

export class AsteroidCollector extends BaseCollector {
  private readonly apiUrl = 'https://api.nasa.gov/neo/rest/v1/feed';
  private readonly apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';

  constructor() {
    // Update every 30 minutes (asteroids don't change that fast)
    super('Near-Earth Asteroids', 'asteroid', 30 * 60 * 1000);
  }

  async fetch(): Promise<Event[]> {
    const today = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const response = await axios.get<NeoWsResponse>(this.apiUrl, {
      params: {
        start_date: today,
        end_date: endDate,
        api_key: this.apiKey,
      },
      timeout: 15000,
    });

    if (!this.validate(response.data)) {
      throw new Error('Invalid response from NASA NeoWs');
    }

    const events: Event[] = [];
    const neos = response.data.near_earth_objects;

    // Flatten all NEOs from all dates
    for (const date of Object.keys(neos)) {
      for (const neo of neos[date]) {
        const approach = neo.close_approach_data[0];
        if (approach) {
          events.push(this.transform(neo, approach));
        }
      }
    }

    // Sort by distance (closest first) and take top 10
    events.sort((a, b) => {
      const distA = (a as AsteroidEvent).data.missDistance;
      const distB = (b as AsteroidEvent).data.missDistance;
      return distA - distB;
    });

    return events.slice(0, 10);
  }

  validate(data: unknown): data is NeoWsResponse {
    if (typeof data !== 'object' || data === null) return false;
    const obj = data as NeoWsResponse;
    return typeof obj.element_count === 'number' && typeof obj.near_earth_objects === 'object';
  }

  private transform(
    neo: NeoWsNeoObject,
    approach: NeoWsNeoObject['close_approach_data'][0]
  ): AsteroidEvent {
    const missDistanceKm = parseFloat(approach.miss_distance.kilometers);
    const missDistanceLunar = parseFloat(approach.miss_distance.lunar);
    const velocityKmh = parseFloat(approach.relative_velocity.kilometers_per_hour);
    const diameterMin = neo.estimated_diameter.meters.estimated_diameter_min;
    const diameterMax = neo.estimated_diameter.meters.estimated_diameter_max;
    const hazardous = neo.is_potentially_hazardous_asteroid;

    // Clean up the name (remove parentheses and extra info)
    const cleanName = neo.name.replace(/[()]/g, '').trim();

    // Calculate severity based on distance and size
    const severity = this.calculateSeverity(missDistanceKm, diameterMax, hazardous);

    return {
      id: `asteroid-${neo.id}`,
      timestamp: approach.epoch_date_close_approach,
      type: 'asteroid',
      source: 'NASA Near Earth Object Web Service',
      location: null, // Asteroids are in space, no ground location
      severity,
      title: `Asteroid ${cleanName}`,
      description: `${missDistanceLunar.toFixed(1)} lunar distances | ${diameterMax.toFixed(0)}m diameter`,
      data: {
        name: cleanName,
        diameterMin,
        diameterMax,
        velocity: velocityKmh,
        missDistance: missDistanceKm,
        hazardous,
        approachDate: approach.close_approach_date,
      },
    };
  }

  private calculateSeverity(distanceKm: number, diameterM: number, hazardous: boolean): number {
    // Base severity on how close and how big
    let severity = 0;

    // Distance factor (closer = higher severity)
    // 1 lunar distance = 384,400 km
    const lunarDistances = distanceKm / 384400;
    if (lunarDistances < 1) severity += 5;
    else if (lunarDistances < 5) severity += 3;
    else if (lunarDistances < 10) severity += 1;

    // Size factor
    if (diameterM > 1000) severity += 3;
    else if (diameterM > 500) severity += 2;
    else if (diameterM > 100) severity += 1;

    // Hazardous bonus
    if (hazardous) severity += 2;

    return Math.min(10, severity);
  }
}
