/**
 * Collector extension template.
 *
 * Copy this file to `src/server/collectors/<name>.ts`, rename the class and
 * replace the TODOs. See ../AUTHORING_GUIDE.md for the full walkthrough.
 *
 * Then register a manifest + factory for it in `src/server/index.ts`:
 *
 *   {
 *     manifest: {
 *       id: 'my_source',
 *       version: '1.0.0',
 *       displayName: 'My Source',
 *       capabilities: ['<event-type>'],
 *       qualityTier: 'supplementary',
 *       enabledByDefault: true,
 *       description: 'What this source provides.',
 *       sourceUrl: 'https://example.com/api',
 *     },
 *     factory: () => new MySourceCollector(),
 *   }
 */

import { BaseCollector } from '../../src/server/collectors/base';
import type { Event } from '../../src/shared/types';

/** Poll interval in milliseconds. Pick something sane for the upstream API's rate limits. */
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export class MySourceCollector extends BaseCollector {
  constructor() {
    super(
      'my_source', // matches the manifest `id` you register in src/server/index.ts
      '<event-type>', // an EventType from src/shared/types.ts
      POLL_INTERVAL_MS
    );
  }

  /**
   * Fetch data from the upstream source and map it to Event[].
   * Throw on failure — BaseCollector's backoff/disable logic depends on
   * fetch() rejecting rather than swallowing errors.
   */
  async fetch(): Promise<Event[]> {
    const response = await fetch('https://example.com/api'); // TODO: real endpoint
    if (!response.ok) {
      throw new Error(`my_source: upstream returned ${response.status}`);
    }
    const data: unknown = await response.json();

    if (!this.validate(data)) {
      throw new Error('my_source: payload failed validation');
    }

    // TODO: map upstream shape -> Event[]
    return [];
  }

  /**
   * Validate the raw upstream payload before mapping it to Event[].
   * Keep this defensive — upstream APIs change shape without notice.
   */
  validate(data: unknown): boolean {
    return typeof data === 'object' && data !== null;
  }
}
