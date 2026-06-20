import type { VisualizationManifest } from '@shared/types';
import { validateVisualizationManifest } from '@shared/types';

export type PluginFactory<T = unknown> = () => T;

interface PluginRegistration<T = unknown> {
  manifest: VisualizationManifest;
  factory: PluginFactory<T>;
}

/**
 * Registry for visualization plugin modules.
 *
 * Mirrors the server-side CollectorRegistry pattern: plugins are registered
 * with a validated manifest and a factory function. The registry enforces:
 *   - Valid manifests (id format, required fields, layer order)
 *   - No duplicate ids
 *   - Dependency ordering at initialization time
 *
 * The generic parameter T is the plugin instance type produced by the factory.
 */
export class VisualizationRegistry<T = unknown> {
  private registrations: PluginRegistration<T>[] = [];
  private initialized: Map<string, T> = new Map();

  /**
   * Register a visualization plugin.
   * Throws synchronously if the manifest is invalid or the id is already registered.
   * Safe to call before `initialize()`.
   */
  register(manifest: VisualizationManifest, factory: PluginFactory<T>): void {
    const result = validateVisualizationManifest(manifest);
    if (!result.valid) {
      const id = (manifest as unknown as Record<string, unknown>).id ?? 'unknown';
      throw new Error(
        `Invalid visualization manifest for "${String(id)}": ${result.errors.join('; ')}`
      );
    }
    if (this.registrations.some((r) => r.manifest.id === manifest.id)) {
      throw new Error(`Duplicate visualization plugin id: "${manifest.id}"`);
    }
    this.registrations.push({ manifest, factory });
  }

  /**
   * Initialize all registered plugins in dependency-safe order.
   * Plugins whose dependencies are not registered will throw.
   * Returns a map of plugin id → instance.
   */
  initialize(): Map<string, T> {
    const ordered = this.topoSort();
    for (const { manifest, factory } of ordered) {
      try {
        const instance = factory();
        this.initialized.set(manifest.id, instance);
      } catch (err) {
        throw new Error(`Failed to initialize plugin "${manifest.id}": ${String(err)}`);
      }
    }
    return new Map(this.initialized);
  }

  /** Returns all registered manifests, ordered by renderOrder tier then registration order. */
  getManifests(): VisualizationManifest[] {
    const tier: Record<string, number> = { base: 0, overlay: 1, hud: 2 };
    return [...this.registrations]
      .sort((a, b) => tier[a.manifest.renderOrder] - tier[b.manifest.renderOrder])
      .map((r) => r.manifest);
  }

  /** Returns the initialized plugin instance for the given id, or undefined. */
  getPlugin(id: string): T | undefined {
    return this.initialized.get(id);
  }

  /** Returns all initialized plugin instances in render order. */
  getPlugins(): T[] {
    const ordered = this.getManifests();
    return ordered.map((m) => this.initialized.get(m.id)).filter((p): p is T => p !== undefined);
  }

  private topoSort(): PluginRegistration<T>[] {
    const byId = new Map(this.registrations.map((r) => [r.manifest.id, r]));
    const visited = new Set<string>();
    const result: PluginRegistration<T>[] = [];

    const visit = (id: string, ancestors: Set<string>) => {
      if (visited.has(id)) return;
      if (ancestors.has(id)) {
        throw new Error(`Circular dependency detected involving plugin "${id}"`);
      }
      const reg = byId.get(id);
      if (!reg) {
        throw new Error(`Plugin dependency "${id}" is not registered`);
      }
      ancestors.add(id);
      for (const dep of reg.manifest.dependencies ?? []) {
        visit(dep, new Set(ancestors));
      }
      ancestors.delete(id);
      visited.add(id);
      result.push(reg);
    };

    for (const { manifest } of this.registrations) {
      visit(manifest.id, new Set());
    }
    return result;
  }
}
