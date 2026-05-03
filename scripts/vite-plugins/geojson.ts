/** Vite/Vitest plugin: treat *.geojson files as JSON modules. */
export function geojsonPlugin() {
  return {
    name: 'geojson',
    transform(code: string, id: string) {
      if (!id.endsWith('.geojson')) return null;
      return { code: `export default ${code}`, map: null };
    },
  };
}
