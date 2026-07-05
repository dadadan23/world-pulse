import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Canvas } from '@react-three/fiber';
import { SkyMap } from './SkyMap';
import { StarField } from './StarField';
import { HorizonRing } from './HorizonRing';
import { BrightStars } from './BrightStars';
import { ConstellationLines } from './ConstellationLines';
import { CoordinateGrid } from './CoordinateGrid';
import { EclipticLine } from './EclipticLine';

describe('SkyMap', () => {
  it('should render without crashing', () => {
    const { container } = render(<SkyMap />);
    expect(container).toBeTruthy();
  });

  it('should display SKY MAP header', () => {
    const { getByText } = render(<SkyMap />);
    expect(getByText(/SKY MAP/i)).toBeTruthy();
  });

  it('should display CELESTIAL label', () => {
    const { getByText } = render(<SkyMap />);
    expect(getByText(/\[CELESTIAL\]/i)).toBeTruthy();
  });

  it('should use default observer position', () => {
    // Default is 40°N, 0°E
    const { container } = render(<SkyMap />);
    expect(container).toBeTruthy();
  });

  it('should accept custom observer coordinates', () => {
    const { container } = render(<SkyMap observerLat={51.5} observerLon={-0.1} />);
    expect(container).toBeTruthy();
  });
});

describe('StarField', () => {
  it('should render stars without errors', () => {
    const { container } = render(
      <Canvas>
        <StarField />
      </Canvas>
    );
    expect(container).toBeTruthy();
  });
});

describe('HorizonRing', () => {
  it('should render horizon ring without errors', () => {
    const { container } = render(
      <Canvas>
        <HorizonRing />
      </Canvas>
    );
    expect(container).toBeTruthy();
  });

  it('should accept observer latitude', () => {
    const { container } = render(
      <Canvas>
        <HorizonRing observerLat={51.5} />
      </Canvas>
    );
    expect(container).toBeTruthy();
  });
});

describe('BrightStars', () => {
  const props = { observerLat: 40, observerLon: 0, observerTime: new Date('2024-06-21T00:00:00Z') };

  it('renders without errors', () => {
    const { container } = render(
      <Canvas>
        <BrightStars {...props} />
      </Canvas>
    );
    expect(container).toBeTruthy();
  });

  it('renders with southern-hemisphere observer', () => {
    const { container } = render(
      <Canvas>
        <BrightStars observerLat={-33} observerLon={151} observerTime={props.observerTime} />
      </Canvas>
    );
    expect(container).toBeTruthy();
  });
});

describe('ConstellationLines', () => {
  const props = { observerLat: 40, observerLon: 0, observerTime: new Date('2024-06-21T00:00:00Z') };

  it('renders without errors', () => {
    const { container } = render(
      <Canvas>
        <ConstellationLines {...props} />
      </Canvas>
    );
    expect(container).toBeTruthy();
  });

  it('renders with a different observer position', () => {
    const { container } = render(
      <Canvas>
        <ConstellationLines observerLat={-10} observerLon={40} observerTime={props.observerTime} />
      </Canvas>
    );
    expect(container).toBeTruthy();
  });
});

describe('CoordinateGrid', () => {
  it('renders the altitude circles and azimuth lines without errors', () => {
    const { container } = render(
      <Canvas>
        <CoordinateGrid />
      </Canvas>
    );
    expect(container).toBeTruthy();
  });
});

describe('EclipticLine', () => {
  const props = { observerLat: 40, observerLon: 0, observerTime: new Date('2024-06-21T00:00:00Z') };

  it('renders without errors', () => {
    const { container } = render(
      <Canvas>
        <EclipticLine {...props} />
      </Canvas>
    );
    expect(container).toBeTruthy();
  });

  it('renders when observer is at high latitude (ecliptic may be mostly below horizon)', () => {
    const { container } = render(
      <Canvas>
        <EclipticLine observerLat={89} observerLon={0} observerTime={props.observerTime} />
      </Canvas>
    );
    expect(container).toBeTruthy();
  });
});
