import type { ProjectionFn } from './projection';

/**
 * Build a greyscale height canvas from procedural noise masked to land areas.
 * The land mask is rasterized from the provided coastline polylines.
 */
export function generateHeightCanvas(
  width: number,
  height: number,
  coastlines: [number, number][][],
  toX: ProjectionFn,
  toY: ProjectionFn
): HTMLCanvasElement {
  const heightCanvas = document.createElement('canvas');
  heightCanvas.width = width;
  heightCanvas.height = height;
  const hctx = heightCanvas.getContext('2d')!;

  // Rasterize coastline polygons into a land mask (white = land)
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const mctx = maskCanvas.getContext('2d')!;
  mctx.fillStyle = '#000';
  mctx.fillRect(0, 0, width, height);
  mctx.fillStyle = '#fff';
  for (const coastline of coastlines) {
    if (coastline.length < 3) continue;
    mctx.beginPath();
    mctx.moveTo(toX(coastline[0][0]), toY(coastline[0][1]));
    for (let i = 1; i < coastline.length; i++) {
      const prevLon = coastline[i - 1][0];
      const currLon = coastline[i][0];
      if (Math.abs(currLon - prevLon) > 180) {
        mctx.stroke();
        mctx.beginPath();
        mctx.moveTo(toX(currLon), toY(coastline[i][1]));
      } else {
        mctx.lineTo(toX(coastline[i][0]), toY(coastline[i][1]));
      }
    }
    mctx.closePath();
    mctx.fill();
  }

  // Separate shelf mask by stroking coastlines broadly. Ocean pixels close to
  // coastlines get a lighter shelf height so the normal map distinguishes
  // continental shelves from deeper ocean.
  const shelfCanvas = document.createElement('canvas');
  shelfCanvas.width = width;
  shelfCanvas.height = height;
  const sctx = shelfCanvas.getContext('2d')!;
  sctx.fillStyle = '#000';
  sctx.fillRect(0, 0, width, height);
  sctx.strokeStyle = '#fff';
  sctx.lineCap = 'round';
  sctx.lineJoin = 'round';
  sctx.lineWidth = 10;
  for (const coastline of coastlines) {
    if (coastline.length < 2) continue;
    sctx.beginPath();
    sctx.moveTo(toX(coastline[0][0]), toY(coastline[0][1]));
    for (let i = 1; i < coastline.length; i++) {
      const prevLon = coastline[i - 1][0];
      const currLon = coastline[i][0];
      if (Math.abs(currLon - prevLon) > 180) {
        sctx.stroke();
        sctx.beginPath();
        sctx.moveTo(toX(currLon), toY(coastline[i][1]));
      } else {
        sctx.lineTo(toX(coastline[i][0]), toY(coastline[i][1]));
      }
    }
    sctx.stroke();
  }

  // Fill height canvas with octave noise, masked to land
  const maskData = mctx.getImageData(0, 0, width, height).data;
  const shelfData = sctx.getImageData(0, 0, width, height).data;
  const hImage = hctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      const ny = y / height;
      let terrainNoise = 0;
      let ridgeNoise = 0;
      let frequency = 1;
      let amplitude = 1;
      for (let octave = 0; octave < 5; octave++) {
        const sample = Math.sin((nx * frequency * 4.7 + ny * frequency * 3.9) * (12.9898 + octave));
        terrainNoise += Math.abs(sample) * amplitude;
        ridgeNoise += (1 - Math.abs(sample)) * amplitude;
        frequency *= 2;
        amplitude *= 0.5;
      }

      const terrain = Math.pow(terrainNoise / (1 - Math.pow(0.5, 5)), 1.25);
      const ridges = Math.pow(ridgeNoise / (1 - Math.pow(0.5, 5)), 1.4);
      const latBand = 1 - Math.abs(ny - 0.5) * 1.6;

      const maskVal = maskData[(y * width + x) * 4];
      const shelfVal = shelfData[(y * width + x) * 4] / 255;

      let heightValue = 0;
      if (maskVal > 128) {
        const landHeight = 90 + terrain * 70 + ridges * 85 + Math.max(latBand, 0) * 18;
        heightValue = Math.min(255, Math.floor(landHeight));
      } else {
        const oceanHeight = 16 + shelfVal * 56 + Math.max(latBand, 0) * 8;
        heightValue = Math.min(96, Math.floor(oceanHeight));
      }

      const idx = (y * width + x) * 4;
      hImage.data[idx] = heightValue;
      hImage.data[idx + 1] = heightValue;
      hImage.data[idx + 2] = heightValue;
      hImage.data[idx + 3] = 255;
    }
  }
  hctx.putImageData(hImage, 0, 0);
  return heightCanvas;
}

/**
 * Derive a tangent-space normal map from a greyscale height canvas.
 * Output is RGB-encoded normals suitable for Three.js normalMap.
 */
export function generateNormalMap(
  heightCanvas: HTMLCanvasElement,
  width: number,
  height: number
): HTMLCanvasElement {
  const hctx = heightCanvas.getContext('2d')!;
  const heightData = hctx.getImageData(0, 0, width, height).data;

  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = width;
  normalCanvas.height = height;
  const nctx = normalCanvas.getContext('2d')!;
  const nImage = nctx.createImageData(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const hL = heightData[(y * width + Math.max(x - 1, 0)) * 4];
      const hR = heightData[(y * width + Math.min(x + 1, width - 1)) * 4];
      const hU = heightData[(Math.max(y - 1, 0) * width + x) * 4];
      const hD = heightData[(Math.min(y + 1, height - 1) * width + x) * 4];

      const dx = (hR - hL) / 255;
      const dy = (hD - hU) / 255;
      const nz = 1.0 / Math.sqrt(dx * dx + dy * dy + 1);
      const nxv = dx * nz;
      const nyv = dy * nz;

      nImage.data[idx] = Math.floor((nxv * 0.5 + 0.5) * 255);
      nImage.data[idx + 1] = Math.floor((nyv * 0.5 + 0.5) * 255);
      nImage.data[idx + 2] = Math.floor(nz * 255);
      nImage.data[idx + 3] = 255;
    }
  }
  nctx.putImageData(nImage, 0, 0);
  return normalCanvas;
}
