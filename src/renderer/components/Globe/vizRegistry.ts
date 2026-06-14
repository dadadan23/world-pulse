import type { VisualizationManifest, VizManifestValidationResult } from '@shared/types';
import { validateVisualizationManifest } from '@shared/types';

export interface VizLayerRegistration {
  manifest: VisualizationManifest;
  /** Whether this module has been disabled at runtime (via feature flag or error). */
  disabled: boolean;
  /** Reason the module was disabled, if applicable. */
  disabledReason?: string;
}

/**
 * Registry for renderer-side visualization layer modules.
 *
 * Modules declare what they render (supportedEventTypes), in what order
 * (renderOrder), and what they depend on. The registry validates manifests,
 * prevents duplicates, and tracks which modules have been disabled at runtime.
 *
 * Consumers iterate getEnabled() to decide which modules participate in each
 * render frame. Disabled modules are skipped without re-throwing errors.
 */
export class VizLayerRegistry {
  private registrations: Map<string, VizLayerRegistration> = new Map();

  /**
   * Register a visualization manifest.
   * Throws synchronously if the manifest is invalid or the id is already registered.
   * Dependency ids listed in `manifest.dependencies` must be registered first; if
   * not yet registered the registration is rejected with a clear error.
   */
  register(manifest: VisualizationManifest): void {
    const result: VizManifestValidationResult = validateVisualizationManifest(manifest);
    if (!result.valid) {
      throw new Error(
        `Invalid visualization manifest for "${manifest.id || 'unknown'}": ${result.errors.join('; ')}`
      );
    }
    if (this.registrations.has(manifest.id)) {
      throw new Error(`Duplicate visualization manifest id: "${manifest.id}"`);
    }
    for (const dep of manifest.dependencies ?? []) {
      if (!this.registrations.has(dep)) {
        throw new Error(
          `Visualization module "${manifest.id}" depends on "${dep}" which is not yet registered`
        );
      }
    }
    this.registrations.set(manifest.id, {
      manifest,
      disabled: !manifest.enabledByDefault,
    });
  }

  /**
   * Disable a module at runtime (e.g. after a render error or via feature flag).
   * Safe to call even if the id is unknown — silently ignored.
   */
  disable(id: string, reason?: string): void {
    const reg = this.registrations.get(id);
    if (reg) {
      reg.disabled = true;
      reg.disabledReason = reason;
    }
  }

  /**
   * Re-enable a previously disabled module.
   * Safe to call even if the id is unknown.
   */
  enable(id: string): void {
    const reg = this.registrations.get(id);
    if (reg) {
      reg.disabled = false;
      reg.disabledReason = undefined;
    }
  }

  /** Returns all enabled registrations sorted by renderOrder ascending. */
  getEnabled(): VizLayerRegistration[] {
    return [...this.registrations.values()]
      .filter((r) => !r.disabled)
      .sort((a, b) => a.manifest.renderOrder - b.manifest.renderOrder);
  }

  /** Returns all registrations (enabled and disabled), sorted by renderOrder. */
  getAll(): VizLayerRegistration[] {
    return [...this.registrations.values()].sort(
      (a, b) => a.manifest.renderOrder - b.manifest.renderOrder
    );
  }

  /** Returns the registration for a given id, or undefined if not registered. */
  get(id: string): VizLayerRegistration | undefined {
    return this.registrations.get(id);
  }

  /** True when no modules are registered. */
  isEmpty(): boolean {
    return this.registrations.size === 0;
  }

  /** Remove all registrations (useful for testing). */
  clear(): void {
    this.registrations.clear();
  }
}

/**
 * Module-level singleton registry.
 * Import this wherever visualization modules need to self-register.
 */
export const globalVizRegistry = new VizLayerRegistry();
