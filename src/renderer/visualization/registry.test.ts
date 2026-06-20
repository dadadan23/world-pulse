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
