import { describe, it, expect, beforeEach } from 'vitest';
import { VizLayerRegistry } from './vizRegistry';
import type { VisualizationManifest } from '@shared/types';

const baseManifest: VisualizationManifest = {
  id: 'earthquake-marker',
  version: '1.0.0',
  displayName: 'Earthquake Markers',
  supportedEventTypes: ['earthquake'],
  renderOrder: 10,
  enabledByDefault: true,
};

describe('VizLayerRegistry (#150, #151)', () => {
  let registry: VizLayerRegistry;

  beforeEach(() => {
    registry = new VizLayerRegistry();
  });

  describe('register()', () => {
    it('accepts a valid manifest', () => {
      expect(() => registry.register(baseManifest)).not.toThrow();
    });

    it('rejects invalid manifest (empty id)', () => {
      expect(() => registry.register({ ...baseManifest, id: '' })).toThrow(/id must be/);
    });

    it('rejects duplicate id', () => {
      registry.register(baseManifest);
      expect(() => registry.register(baseManifest)).toThrow(/Duplicate/);
    });

    it('rejects unresolved dependency', () => {
      const dep: VisualizationManifest = {
        ...baseManifest,
        id: 'overlay',
        dependencies: ['base-globe'],
      };
      expect(() => registry.register(dep)).toThrow(/base-globe/);
    });

    it('accepts dependency when registered first', () => {
      const base: VisualizationManifest = {
        ...baseManifest,
        id: 'base-globe',
        renderOrder: 0,
      };
      const overlay: VisualizationManifest = {
        ...baseManifest,
        id: 'overlay',
        renderOrder: 20,
        dependencies: ['base-globe'],
      };
      registry.register(base);
      expect(() => registry.register(overlay)).not.toThrow();
    });
  });

  describe('getEnabled()', () => {
    it('returns enabled modules sorted by renderOrder', () => {
      registry.register({ ...baseManifest, id: 'b', renderOrder: 20 });
      registry.register({ ...baseManifest, id: 'a', renderOrder: 10 });
      const ids = registry.getEnabled().map((r) => r.manifest.id);
      expect(ids).toEqual(['a', 'b']);
    });

    it('excludes modules with enabledByDefault: false', () => {
      registry.register({ ...baseManifest, id: 'off', enabledByDefault: false });
      expect(registry.getEnabled()).toHaveLength(0);
    });

    it('excludes runtime-disabled modules', () => {
      registry.register(baseManifest);
      registry.disable(baseManifest.id, 'test');
      expect(registry.getEnabled()).toHaveLength(0);
    });
  });

  describe('disable() / enable() (#151)', () => {
    it('disables a module with a reason', () => {
      registry.register(baseManifest);
      registry.disable(baseManifest.id, 'render error');
      const reg = registry.get(baseManifest.id);
      expect(reg?.disabled).toBe(true);
      expect(reg?.disabledReason).toBe('render error');
    });

    it('re-enables a disabled module', () => {
      registry.register(baseManifest);
      registry.disable(baseManifest.id);
      registry.enable(baseManifest.id);
      expect(registry.get(baseManifest.id)?.disabled).toBe(false);
    });

    it('silently ignores disable/enable for unknown ids', () => {
      expect(() => registry.disable('unknown')).not.toThrow();
      expect(() => registry.enable('unknown')).not.toThrow();
    });
  });

  describe('getAll()', () => {
    it('returns both enabled and disabled modules', () => {
      registry.register(baseManifest);
      registry.register({ ...baseManifest, id: 'other', renderOrder: 20, enabledByDefault: false });
      expect(registry.getAll()).toHaveLength(2);
    });
  });

  describe('isEmpty() / clear()', () => {
    it('isEmpty() is true when no modules registered', () => {
      expect(registry.isEmpty()).toBe(true);
    });

    it('isEmpty() is false after registration', () => {
      registry.register(baseManifest);
      expect(registry.isEmpty()).toBe(false);
    });

    it('clear() removes all registrations', () => {
      registry.register(baseManifest);
      registry.clear();
      expect(registry.isEmpty()).toBe(true);
    });
  });
});
