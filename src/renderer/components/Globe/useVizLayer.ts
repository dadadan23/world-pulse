import { useCallback } from 'react';
import type { VizLayerRegistry } from './vizRegistry';
import type { VizRenderContext } from '@shared/types';

/**
 * Hook that wraps a visualization module's render call with a safe fallback.
 *
 * If the render function throws, the module is disabled in the registry
 * (so subsequent frames skip it) and the error is logged. The hook returns
 * `renderSafe`, which callers use instead of calling module render directly.
 *
 * Usage:
 *   const { renderSafe } = useVizLayer(registry, 'earthquake-marker');
 *   // In render: renderSafe(() => myModule.render(events, ctx));
 */
export function useVizLayer(registry: VizLayerRegistry, moduleId: string) {
  const renderSafe = useCallback(
    (renderFn: (ctx: VizRenderContext) => void, ctx: VizRenderContext): boolean => {
      const reg = registry.get(moduleId);
      if (!reg || reg.disabled) return false;

      try {
        renderFn(ctx);
        return true;
      } catch (err) {
        const reason = err instanceof Error ? err.message : 'Unknown render error';
        console.error(
          `[VizRegistry] Module "${moduleId}" threw during render; disabling: ${reason}`
        );
        registry.disable(moduleId, reason);
        return false;
      }
    },
    [registry, moduleId]
  );

  return { renderSafe };
}

/**
 * Utility: execute a render function for each enabled module that supports
 * the given event type, with safe fallback on error.
 *
 * Returns the set of module ids that were successfully rendered.
 */
export function renderModulesForEventType(
  registry: VizLayerRegistry,
  eventType: string,
  renderFn: (moduleId: string, ctx: VizRenderContext) => void,
  ctx: VizRenderContext
): Set<string> {
  const rendered = new Set<string>();
  for (const reg of registry.getEnabled()) {
    if (!reg.manifest.supportedEventTypes.includes(eventType as never)) continue;
    try {
      renderFn(reg.manifest.id, ctx);
      rendered.add(reg.manifest.id);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Unknown error';
      console.error(
        `[VizRegistry] Module "${reg.manifest.id}" failed for event type "${eventType}"; disabling: ${reason}`
      );
      registry.disable(reg.manifest.id, reason);
    }
  }
  return rendered;
}
