/**
 * Visualization extension template.
 *
 * Copy this file as a starting point for a new globe/overlay/HUD render
 * layer. See ../AUTHORING_GUIDE.md for the full walkthrough.
 *
 * Register it against the app's VisualizationRegistry instance:
 *
 *   registry.register(manifest, () => createMyLayerPlugin());
 */

import type { VisualizationManifest } from '../../src/shared/types';

/** Replace with whatever instance type your render layer actually needs. */
export interface MyLayerPlugin {
  /** Called once per frame (or on event update) by whatever owns the render loop. */
  update(): void;
  /** Release any GPU resources / listeners. Called when the plugin is disabled or torn down. */
  dispose(): void;
}

export const myLayerManifest: VisualizationManifest = {
  id: 'my_layer', // stable snake_case id, unique across the registry
  version: '1.0.0',
  displayName: 'My Layer',
  supportedEventTypes: ['<event-type>'], // EventType[] from src/shared/types.ts
  renderOrder: 'overlay', // 'base' | 'overlay' | 'hud' — renders bottom-to-top
  // dependencies: ['some_other_plugin_id'], // uncomment if render order depends on another plugin
  description: 'What this layer renders and why.',
};

/**
 * Factory passed to `VisualizationRegistry.register()`.
 * Must have no side effects until actually invoked by `initialize()` —
 * the registry may decide not to call this (budget limits, disabled state)
 * and the plugin must not have allocated anything before that point.
 */
export function createMyLayerPlugin(): MyLayerPlugin {
  return {
    update() {
      // TODO: per-frame/per-event render logic
    },
    dispose() {
      // TODO: cleanup
    },
  };
}
