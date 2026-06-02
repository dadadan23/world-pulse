/**
 * USGS Earthquake Data Collector
 * API: https://earthquake.usgs.gov/fdsnws/event/1/
 */

import axios from 'axios';
import type { Event, EarthquakeEvent, QualityTier } from '@shared/types';
import { BaseCollector } from './base';

interface USGSFeature {
  id: string;
  properties: {
    mag: number;
    place: string;
    time: number;
    updated: number;
    url: string;
    detail: string;
    type: string;
  };
  geometry: {
    coordinates: [number, number, number]; // [lon, lat, depth]
  };
}

interface USGSResponse {
  type: string;
  metadata: Record<string, unknown>;
  features: USGSFeature[];
}

interface USGSFeatureLike {
  properties?: {
    mag?: unknown;
  };
}

export class EarthquakeCollector extends BaseCollector {
  public readonly qualityTier: QualityTier = 'primary';
  private readonly apiUrl = 'https://earthquake.usgs.gov/fdsnws/event/1/query';
  private readonly minMagnitude = 2.5; // Only show significant quakes
  private readonly lookbackHours = 24;

  constructor() {
    super('USGS Earthquakes', 'earthquake', 5 * 60 * 1000); // 5 minutes
  }

  async fetch(): Promise<Event[]> {
    const startTime = new Date(Date.now() - this.lookbackHours * 60 * 60 * 1000).toISOString();

    const response = await axios.get<USGSResponse>(this.apiUrl, {
      params: {
        format: 'geojson',
        starttime: startTime,
        minmagnitude: this.minMagnitude,
        orderby: 'time',
      },
      timeout: 10000,
    });

    if (!this.validate(response.data)) {
      throw new Error('Invalid response from USGS API');
    }

    return response.data.features.map((feature) => this.transform(feature));
  }

  validate(data: unknown): data is USGSResponse {
    if (typeof data !== 'object' || data === null) return false;
    const obj = data as Partial<USGSResponse>;
    return (
      obj.type === 'FeatureCollection' &&
      Array.isArray(obj.features) &&
      obj.features.every((feature) => {
        const candidate = feature as USGSFeatureLike;
        return candidate.properties?.mag !== undefined;
      })
    );
  }

  private transform(feature: USGSFeature): EarthquakeEvent {
    const [lon, lat, depth] = feature.geometry.coordinates;
    const magnitude = feature.properties.mag;

    return {
      id: `quake-${feature.id}`,
      timestamp: feature.properties.time,
      type: 'earthquake',
      source: 'USGS Earthquake Hazards Program',
      location: { lat, lon, name: feature.properties.place },
      severity: this.calculateSeverity(magnitude),
      title: `M${magnitude.toFixed(1)} - ${feature.properties.place}`,
      description: `Depth: ${depth.toFixed(1)} km`,
      data: {
        magnitude,
        depth,
        region: feature.properties.place,
      },
    };
  }

  /**
   * Map magnitude to 0-10 severity scale for visualization
   */
  private calculateSeverity(magnitude: number): number {
    // Magnitude 2.5 = severity 0, magnitude 7+ = severity 10
    const normalized = (magnitude - 2.5) / 4.5;
    return Math.max(0, Math.min(10, normalized * 10));
  }
}
