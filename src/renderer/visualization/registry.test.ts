import { describe, it, expect } from 'vitest';
import { VisualizationRegistry } from './registry';
import type { VisualizationManifest } from '@shared/types';

const baseManifest = (overrides: Partial<VisualizationManifest> = {}): VisualizationManifest => ({
  id: 'test_plugin',
  version: '1.0.0',
  displayName: 'Test Plugin',
  supportedEventTypes: ['earthquake'],
  renderOrder: 'overlay',
  ...overrides,
});

describe('VisualizationRegistry', () => {
  describe('register', () => {
    it('accepts a valid manifest', () => {
      const reg = new VisualizationRegistry();
      expect(() => reg.register(baseManifest(), () => ({}))).not.toThrow();
    });

    it('rejects a manifest with an invalid id (not snake_case)', () => {
      const reg = new VisualizationRegistry();
      expect(() => reg.register(baseManifest({ id: 'My-Plugin' }), () => ({}))).toThrow(
        /id must be snake_case/
      );
    });

    it('rejects a manifest missing displayName', () => {
      const reg = new VisualizationRegistry();
      expect(() => reg.register(baseManifest({ displayName: '' }), () => ({}))).toThrow(
        /displayName/
      );
    });

    it('rejects a manifest with invalid renderOrder', () => {
      const reg = new VisualizationRegistry();
      expect(() =>
        reg.register(baseManifest({ renderOrder: 'ground' as never }), () => ({}))
      ).toThrow(/renderOrder/);
    });

    it('rejects duplicate plugin ids', () => {
      const reg = new VisualizationRegistry();
      reg.register(baseManifest(), () => ({}));
      expect(() => reg.register(baseManifest(), () => ({}))).toThrow(/Duplicate/);
    });

    it('rejects empty supportedEventTypes', () => {
      const reg = new VisualizationRegistry();
      expect(() => reg.register(baseManifest({ supportedEventTypes: [] }), () => ({}))).toThrow(
        /supportedEventTypes/
      );
    });
  });

  describe('initialize', () => {
    it('returns a map of plugin instances', () => {
      const reg = new VisualizationRegistry<string>();
      reg.register(baseManifest(), () => 'instance-a');
      const result = reg.initialize();
      expect(result.get('test_plugin')).toBe('instance-a');
    });

    it('respects dependency ordering', () => {
      const order: string[] = [];
      const reg = new VisualizationRegistry();
      reg.register(baseManifest({ id: 'base_layer', renderOrder: 'base' }), () => {
        order.push('base_layer');
        return {};
      });
      reg.register(baseManifest({ id: 'dep_plugin', dependencies: ['base_layer'] }), () => {
        order.push('dep_plugin');
        return {};
      });
      reg.initialize();
      expect(order).toEqual(['base_layer', 'dep_plugin']);
    });

    it('throws on circular dependency', () => {
      const reg = new VisualizationRegistry();
      reg.register(baseManifest({ id: 'plugin_a', dependencies: ['plugin_b'] }), () => ({}));
      reg.register(baseManifest({ id: 'plugin_b', dependencies: ['plugin_a'] }), () => ({}));
      expect(() => reg.initialize()).toThrow(/Circular dependency/);
    });

    it('throws when a dependency is not registered', () => {
      const reg = new VisualizationRegistry();
      reg.register(baseManifest({ id: 'orphan', dependencies: ['missing_dep'] }), () => ({}));
      expect(() => reg.initialize()).toThrow(/not registered/);
    });
  });

  describe('fallback for unsupported modules (#151)', () => {
    it('does not throw when a plugin factory throws; continues initializing others', () => {
      const reg = new VisualizationRegistry<string>();
      reg.register(baseManifest({ id: 'broken' }), () => {
        throw new Error('boom');
      });
      reg.register(baseManifest({ id: 'fine' }), () => 'fine-instance');

      let result: Map<string, string> | undefined;
      expect(() => {
        result = reg.initialize();
      }).not.toThrow();

      expect(result?.get('broken')).toBeUndefined();
      expect(result?.get('fine')).toBe('fine-instance');
    });

    it('records a concise failure reason for a plugin whose factory throws', () => {
      const reg = new VisualizationRegistry();
      reg.register(baseManifest({ id: 'broken' }), () => {
        throw new Error('boom');
      });
      reg.initialize();
      expect(reg.getFailures()).toEqual([{ id: 'broken', reason: 'boom' }]);
    });

    it('excludes a failed plugin from getPlugins() so rendering falls back to defaults', () => {
      const reg = new VisualizationRegistry<string>();
      reg.register(baseManifest({ id: 'broken' }), () => {
        throw new Error('boom');
      });
      reg.register(baseManifest({ id: 'fine' }), () => 'fine-instance');
      reg.initialize();
      expect(reg.getPlugins()).toEqual(['fine-instance']);
    });

    it('disable() prevents a plugin from being initialized', () => {
      const reg = new VisualizationRegistry<string>();
      reg.register(baseManifest(), () => 'instance-a');
      reg.disable('test_plugin', 'flagged as problematic');
      reg.initialize();
      expect(reg.getPlugin('test_plugin')).toBeUndefined();
      expect(reg.getFailures()).toEqual([{ id: 'test_plugin', reason: 'flagged as problematic' }]);
    });

    it('disable() removes an already-initialized instance immediately', () => {
      const reg = new VisualizationRegistry<string>();
      reg.register(baseManifest(), () => 'instance-a');
      reg.initialize();
      expect(reg.getPlugin('test_plugin')).toBe('instance-a');

      reg.disable('test_plugin');
      expect(reg.getPlugin('test_plugin')).toBeUndefined();
    });

    it('enable() clears the disabled flag and failure record', () => {
      const reg = new VisualizationRegistry<string>();
      reg.register(baseManifest(), () => 'instance-a');
      reg.disable('test_plugin');
      reg.enable('test_plugin');
      expect(reg.isDisabled('test_plugin')).toBe(false);
      reg.initialize();
      expect(reg.getPlugin('test_plugin')).toBe('instance-a');
      expect(reg.getFailures()).toEqual([]);
    });

    it('still throws for structural configuration errors (circular/missing dependency)', () => {
      const reg = new VisualizationRegistry();
      reg.register(baseManifest({ id: 'orphan', dependencies: ['missing_dep'] }), () => ({}));
      expect(() => reg.initialize()).toThrow(/not registered/);
    });
  });

  describe('getManifests', () => {
    it('returns manifests sorted by render order tier', () => {
      const reg = new VisualizationRegistry();
      reg.register(baseManifest({ id: 'hud_plugin', renderOrder: 'hud' }), () => ({}));
      reg.register(baseManifest({ id: 'base_plugin', renderOrder: 'base' }), () => ({}));
      reg.register(baseManifest({ id: 'overlay_plugin', renderOrder: 'overlay' }), () => ({}));
      const manifests = reg.getManifests();
      expect(manifests.map((m) => m.renderOrder)).toEqual(['base', 'overlay', 'hud']);
    });
  });

  describe('layer budget guardrails (#152)', () => {
    it('has no limit by default', () => {
      const reg = new VisualizationRegistry<string>();
      reg.register(baseManifest({ id: 'a' }), () => 'a');
      reg.register(baseManifest({ id: 'b' }), () => 'b');
      reg.initialize();
      expect(reg.getPlugins()).toEqual(['a', 'b']);
      expect(reg.getBudgetViolations()).toEqual([]);
    });

    it('throttles layers beyond a configured per-tier budget', () => {
      const reg = new VisualizationRegistry<string>({ maxLayersByOrder: { overlay: 1 } });
      reg.register(baseManifest({ id: 'a', renderOrder: 'overlay' }), () => 'a');
      reg.register(baseManifest({ id: 'b', renderOrder: 'overlay' }), () => 'b');
      reg.initialize();
      expect(reg.getPlugins()).toEqual(['a']);
      expect(reg.getPlugin('b')).toBeUndefined();
    });

    it('does not count a different tier against another tier budget', () => {
      const reg = new VisualizationRegistry<string>({ maxLayersByOrder: { overlay: 1 } });
      reg.register(baseManifest({ id: 'a', renderOrder: 'overlay' }), () => 'a');
      reg.register(baseManifest({ id: 'b', renderOrder: 'base' }), () => 'b');
      reg.initialize();
      expect(reg.getPlugins().sort()).toEqual(['a', 'b']);
    });

    it('throttles layers beyond a configured total budget across tiers', () => {
      const reg = new VisualizationRegistry<string>({ maxTotalLayers: 1 });
      reg.register(baseManifest({ id: 'a', renderOrder: 'base' }), () => 'a');
      reg.register(baseManifest({ id: 'b', renderOrder: 'hud' }), () => 'b');
      reg.initialize();
      expect(reg.getPlugins()).toEqual(['a']);
    });

    it('records a concise budget violation reason for telemetry', () => {
      const reg = new VisualizationRegistry({ maxLayersByOrder: { overlay: 1 } });
      reg.register(baseManifest({ id: 'a', renderOrder: 'overlay' }), () => ({}));
      reg.register(baseManifest({ id: 'b', renderOrder: 'overlay' }), () => ({}));
      reg.initialize();
      expect(reg.getBudgetViolations()).toEqual([
        { id: 'b', renderOrder: 'overlay', reason: 'tier "overlay" layer budget of 1 exceeded' },
      ]);
    });

    it('excludes budget-throttled plugins from getPlugins() so rendering falls back to defaults', () => {
      const reg = new VisualizationRegistry<string>({ maxLayersByOrder: { overlay: 0 } });
      reg.register(baseManifest({ id: 'a', renderOrder: 'overlay' }), () => 'a');
      reg.initialize();
      expect(reg.getPlugins()).toEqual([]);
    });

    it('setBudget() reconfigures thresholds applied on the next initialize()', () => {
      const reg = new VisualizationRegistry<string>();
      reg.register(baseManifest({ id: 'a', renderOrder: 'overlay' }), () => 'a');
      reg.register(baseManifest({ id: 'b', renderOrder: 'overlay' }), () => 'b');
      reg.setBudget({ maxLayersByOrder: { overlay: 1 } });
      reg.initialize();
      expect(reg.getPlugins()).toEqual(['a']);
    });

    it('a plugin that fails to initialize does not consume budget for the next plugin', () => {
      const reg = new VisualizationRegistry<string>({ maxLayersByOrder: { overlay: 1 } });
      reg.register(baseManifest({ id: 'broken', renderOrder: 'overlay' }), () => {
        throw new Error('boom');
      });
      reg.register(baseManifest({ id: 'fine', renderOrder: 'overlay' }), () => 'fine-instance');
      reg.initialize();
      expect(reg.getPlugins()).toEqual(['fine-instance']);
    });
  });

  describe('getPlugin / getPlugins', () => {
    it('returns undefined for unknown id before initialize', () => {
      const reg = new VisualizationRegistry();
      expect(reg.getPlugin('nope')).toBeUndefined();
    });

    it('returns initialized instances in render order', () => {
      const reg = new VisualizationRegistry<string>();
      reg.register(baseManifest({ id: 'hud_p', renderOrder: 'hud' }), () => 'hud');
      reg.register(baseManifest({ id: 'base_p', renderOrder: 'base' }), () => 'base');
      reg.initialize();
      expect(reg.getPlugins()).toEqual(['base', 'hud']);
    });
  });
});
