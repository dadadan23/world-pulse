/**
 * Volcano Alert Collector
 * API: USGS Volcano Hazards Program
 * https://volcanoes.usgs.gov/hans-public/api/
 */

import axios from 'axios';
import type { Event, VolcanoEvent, QualityTier } from '@shared/types';
import { BaseCollector } from './base';

interface USGSVolcano {
  vnum: string;
  volcanoName: string;
  country: string;
  latitude: number;
  longitude: number;
  region: string;
}

interface USGSVolcanoNotice {
  volcanoId: string;
  volcanoName: string;
  observatoryCode: string;
  currentColorCode: string;
  currentAlertLevel: string;
  sentUtc: string;
  volcanoLatitude: number;
  volcanoLongitude: number;
  noticeType: string;
}

interface USGSElevatedResponse {
  type: string;
  features: Array<{
    properties: USGSVolcanoNotice;
  }>;
}

export class VolcanoCollector extends BaseCollector {
  public readonly qualityTier: QualityTier = 'primary';
  // Get all elevated volcanoes (yellow, orange, red alert levels)
  private readonly elevatedUrl =
    'https://volcanoes.usgs.gov/hans-public/api/volcano/getElevatedVolcanoes';

  // Fallback: Get all monitored volcanoes
  private readonly monitoredUrl =
    'https://volcanoes.usgs.gov/hans-public/api/volcano/getMonitoredVolcanoes';

  constructor() {
    // Update every 15 minutes
    super('USGS Volcanoes', 'volcano', 15 * 60 * 1000);
  }

  async fetch(): Promise<Event[]> {
    try {
      // Try to get elevated volcanoes first
      const response = await axios.get<USGSElevatedResponse>(this.elevatedUrl, {
        timeout: 10000,
      });

      if (this.validate(response.data)) {
        return response.data.features.map((f) => this.transform(f.properties));
      }
    } catch {
      // If elevated endpoint fails, try monitored volcanoes
      try {
        const response = await axios.get<USGSVolcano[]>(this.monitoredUrl, {
          timeout: 10000,
        });

        if (this.validateMonitored(response.data)) {
          // Return volcanoes as normal status events
          return response.data.slice(0, 10).map((v) => this.transformMonitored(v));
        }
      } catch {
        // Both failed, return empty
        return [];
      }
    }

    return [];
  }

  validate(data: unknown): data is USGSElevatedResponse {
    if (typeof data !== 'object' || data === null) return false;
    const obj = data as USGSElevatedResponse;
    return obj.type === 'FeatureCollection' && Array.isArray(obj.features);
  }

  private validateMonitored(data: unknown): data is USGSVolcano[] {
    if (!Array.isArray(data)) return false;
    if (data.length === 0) return true;
    const first = data[0];
    return (
      typeof first === 'object' && first !== null && 'volcanoName' in first && 'latitude' in first
    );
  }

  private transform(notice: USGSVolcanoNotice): VolcanoEvent {
    const colorCode = notice.currentColorCode.toLowerCase() as
      'green' | 'yellow' | 'orange' | 'red';
    const alertLevel = notice.currentAlertLevel.toLowerCase() as
      'normal' | 'advisory' | 'watch' | 'warning';
    const severity = this.getSeverity(colorCode);

    return {
      id: `volcano-${notice.volcanoId}`,
      timestamp: new Date(notice.sentUtc).getTime(),
      type: 'volcano',
      source: 'Smithsonian Global Volcanism Program',
      location: {
        lat: notice.volcanoLatitude,
        lon: notice.volcanoLongitude,
        name: notice.volcanoName,
      },
      severity,
      title: `${notice.volcanoName} - ${alertLevel.toUpperCase()}`,
      description: `Alert: ${alertLevel} | Color: ${colorCode}`,
      data: {
        volcanoName: notice.volcanoName,
        alertLevel,
        colorCode,
      },
    };
  }

  private transformMonitored(volcano: USGSVolcano): VolcanoEvent {
    return {
      id: `volcano-${volcano.vnum}`,
      timestamp: Date.now(),
      type: 'volcano',
      source: 'USGS Volcano Hazards Program',
      location: {
        lat: volcano.latitude,
        lon: volcano.longitude,
        name: volcano.volcanoName,
      },
      severity: 1, // Normal/monitored
      title: `${volcano.volcanoName} - MONITORED`,
      description: `${volcano.region}, ${volcano.country}`,
      data: {
        volcanoName: volcano.volcanoName,
        alertLevel: 'normal',
        colorCode: 'green',
      },
    };
  }

  private getSeverity(colorCode: string): number {
    switch (colorCode) {
      case 'red':
        return 10;
      case 'orange':
        return 7;
      case 'yellow':
        return 4;
      default:
        return 1;
    }
  }
}
