import type { CollectorManifest, Event } from '@shared/types';
import { validateManifest, validateEventPayload } from '@shared/types';
import type { BaseCollector } from './base';

type CollectorFactory = () => BaseCollector;

interface CollectorRegistration {
  manifest: CollectorManifest;
  factory: CollectorFactory;
}

/**
 * Registry-based lifecycle manager for collector modules.
 *
 * Each collector is registered with a validated manifest before startup.
 * The registry isolates failures so one broken collector never blocks others.
 */
export class CollectorRegistry {
  private registrations: CollectorRegistration[] = [];
  private active: BaseCollector[] = [];
  private skipped: CollectorManifest[] = [];

  /**
   * Register a collector module.
   * Throws if the manifest is invalid or the id is already registered.
   * Registration is safe to call before `start()`.
   */
  register(manifest: CollectorManifest, factory: CollectorFactory): void {
    const result = validateManifest(manifest);
    if (!result.valid) {
      throw new Error(
        `Invalid manifest for "${manifest.id || 'unknown'}": ${result.errors.join('; ')}`
      );
    }
    if (this.registrations.some((r) => r.manifest.id === manifest.id)) {
      throw new Error(`Duplicate collector manifest id: "${manifest.id}"`);
    }
    this.registrations.push({ manifest, factory });
  }

  /**
   * Start all enabled collectors.
   * Collectors with `enabledByDefault: false` are skipped.
   * Instantiation and start errors are logged and isolated - they do not
   * prevent other collectors from starting.
   */
  start(onEvents: (events: Event[]) => void): BaseCollector[] {
    for (const { manifest, factory } of this.registrations) {
      if (!manifest.enabledByDefault) {
        console.warn(`[Registry] Skipping disabled collector: ${manifest.id}`);
        continue;
      }

      if (manifest.requiredEnvVars && manifest.requiredEnvVars.length > 0) {
        const missing = manifest.requiredEnvVars.filter((v) => !process.env[v]);
        if (missing.length > 0) {
          console.warn(
            `[Registry] Skipping "${manifest.id}": missing required env vars: ${missing.join(', ')}`
          );
          this.skipped.push(manifest);
          continue;
        }
      }

      let collector: BaseCollector;
      try {
        collector = factory();
      } catch (err) {
        console.error(`[Registry] Failed to instantiate collector "${manifest.id}":`, err);
        continue;
      }

      try {
        collector.start((rawEvents) => {
          const valid = rawEvents.filter((e) => {
            const result = validateEventPayload(e);
            if (!result.valid) {
              console.warn(
                `[Registry] Dropping invalid event from "${manifest.id}": ${result.reason}`
              );
              return false;
            }
            return true;
          });
          if (valid.length > 0) onEvents(valid);
        });
        this.active.push(collector);
      } catch (err) {
        console.error(`[Registry] Failed to start collector "${manifest.id}":`, err);
      }
    }

    return this.getCollectors();
  }

  /**
   * Stop all active collectors.
   * Stop errors are silently caught to avoid cascading failures during shutdown.
   */
  stop(): void {
    for (const c of this.active) {
      try {
        c.stop();
      } catch {
        // Ignore stop errors - we are shutting down regardless.
      }
    }
    this.active = [];
  }

  /** Returns a snapshot of the currently active collector instances. */
  getCollectors(): BaseCollector[] {
    return [...this.active];
  }

  /** Returns manifests for collectors skipped due to missing required env vars. */
  getSkippedManifests(): CollectorManifest[] {
    return [...this.skipped];
  }
}
