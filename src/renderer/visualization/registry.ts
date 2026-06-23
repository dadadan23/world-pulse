import type { VisualizationLayerOrder, VisualizationManifest } from '@shared/types';
import { validateVisualizationManifest } from '@shared/types';

export type PluginFactory<T = unknown> = () => T;

interface PluginRegistration<T = unknown> {
  manifest: VisualizationManifest;
  factory: PluginFactory<T>;
}

/**
 * Concise, non-blocking record of why a plugin isn't rendering (#151).
 * Surfaced via `getFailures()` for UI-level error reporting that never
 * crashes the globe — unsupported modules just fall back to no-op.
 */
export interface PluginFailure {
  id: string;
  reason: string;
}

/**
 * Configurable layer budget thresholds (#152). Undefined fields mean "no limit".
 * Re-evaluated from scratch on every `initialize()` call via `setBudget()`.
 */
export interface VisualizationBudget {
  /** Max number of layers allowed per render-order tier (base/overlay/hud). */
  maxLayersByOrder?: Partial<Record<VisualizationLayerOrder, number>>;
  /** Max total number of layers allowed across all tiers combined. */
  maxTotalLayers?: number;
}

/** Concise record of a plugin throttled/suppressed for exceeding a layer budget (#152). */
export interface BudgetViolation {
  id: string;
  renderOrder: VisualizationLayerOrder;
  reason: string;
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
  private disabled: Set<string> = new Set();
  private failures: Map<string, PluginFailure> = new Map();
  private budget: VisualizationBudget;
  private budgetViolations: Map<string, BudgetViolation> = new Map();

  constructor(budget: VisualizationBudget = {}) {
    this.budget = budget;
  }

  /** Reconfigure layer budget thresholds (#152). Takes effect on the next `initialize()`. */
  setBudget(budget: VisualizationBudget): void {
    this.budget = budget;
  }

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
   * Plugins whose dependencies are not registered or form a cycle indicate a
   * configuration bug and still throw. A plugin whose *factory* throws is
   * treated as unsupported: it is skipped (recorded in `getFailures()`) so
   * the rest of the globe keeps rendering with default marker treatment (#151).
   * Returns a map of plugin id → instance.
   */
  initialize(): Map<string, T> {
    const ordered = this.topoSort();
    const tierCounts: Record<VisualizationLayerOrder, number> = { base: 0, overlay: 0, hud: 0 };
    let totalCount = 0;
    this.budgetViolations.clear();

    for (const { manifest, factory } of ordered) {
      if (this.disabled.has(manifest.id)) continue;

      const tierLimit = this.budget.maxLayersByOrder?.[manifest.renderOrder];
      if (tierLimit !== undefined && tierCounts[manifest.renderOrder] >= tierLimit) {
        this.recordBudgetViolation(
          manifest.id,
          manifest.renderOrder,
          `tier "${manifest.renderOrder}" layer budget of ${tierLimit} exceeded`
        );
        continue;
      }
      if (this.budget.maxTotalLayers !== undefined && totalCount >= this.budget.maxTotalLayers) {
        this.recordBudgetViolation(
          manifest.id,
          manifest.renderOrder,
          `total layer budget of ${this.budget.maxTotalLayers} exceeded`
        );
        continue;
      }

      try {
        const instance = factory();
        this.initialized.set(manifest.id, instance);
        this.failures.delete(manifest.id);
        tierCounts[manifest.renderOrder] += 1;
        totalCount += 1;
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        this.initialized.delete(manifest.id);
        this.failures.set(manifest.id, { id: manifest.id, reason });
      }
    }
    return new Map(this.initialized);
  }

  /** Throttled/suppressed plugins that exceeded a configured layer budget (#152). */
  getBudgetViolations(): BudgetViolation[] {
    return [...this.budgetViolations.values()];
  }

  private recordBudgetViolation(
    id: string,
    renderOrder: VisualizationLayerOrder,
    reason: string
  ): void {
    this.initialized.delete(id);
    this.budgetViolations.set(id, { id, renderOrder, reason });
    console.warn(`[VisualizationRegistry] Suppressed "${id}": ${reason}`);
  }

  /**
   * Kill switch: rapidly disable a problematic plugin so it stops rendering.
   * Safe to call before or after `initialize()`. Recorded as a failure so
   * UI surfaces a concise, non-blocking explanation.
   */
  disable(id: string, reason = 'Disabled via kill switch'): void {
    this.disabled.add(id);
    this.initialized.delete(id);
    this.failures.set(id, { id, reason });
  }

  /** Re-enable a previously disabled plugin. Does not re-run initialize(). */
  enable(id: string): void {
    this.disabled.delete(id);
    this.failures.delete(id);
  }

  isDisabled(id: string): boolean {
    return this.disabled.has(id);
  }

  /** Concise, non-blocking failure reasons for plugins that aren't rendering. */
  getFailures(): PluginFailure[] {
    return [...this.failures.values()];
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
