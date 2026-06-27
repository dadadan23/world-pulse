import { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../../store/useAppStore';
import { createEarthTextures } from './textureRenderer';
import { latLonToVector3 } from './projection';
import { ne110mCoastlineSource } from './geoJsonCoastlineSource';
import { ne110mBoundarySource } from './geoJsonBoundarySource';
import { CityLabels } from './CityLabels';
import { lonToGlobeRotationY, shortestAngleDiff } from './globeRotation';
import type { Event } from '@shared/types';

const GLOBE_RADIUS = 1;

// Oblivion color palette for 3D elements
const OB_COLORS = {
  cyan: '#00D4FF',
  cyanDim: '#00D4FF',
  amber: '#FF8C42',
  danger: '#FF3D3D',
  atmosphere: '#00D4FF',
  stars: '#C8E6F0',
};

const ATMOSPHERE_VERTEX_SHADER = `
varying float vFresnel;
varying float vSun;

uniform float uPower;
uniform vec3 uSunDirection;

void main() {
  vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
  vec3 worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  vec3 viewDirection = normalize(cameraPosition - worldPosition);

  float fresnel = 1.0 - clamp(dot(worldNormal, viewDirection), 0.0, 1.0);
  vFresnel = pow(fresnel, uPower);
  vSun = clamp(dot(worldNormal, normalize(uSunDirection)) * 0.5 + 0.5, 0.0, 1.0);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const ATMOSPHERE_FRAGMENT_SHADER = `
varying float vFresnel;
varying float vSun;

uniform vec3 uColor;
uniform float uOpacity;
uniform float uIntensity;
uniform float uPulseAmplitude;
uniform float uTime;

void main() {
  float pulse = 1.0 + sin(uTime * 0.6) * uPulseAmplitude;
  float sunBoost = mix(0.85, 1.15, vSun);
  float alpha = vFresnel * uOpacity * uIntensity * pulse * sunBoost;

  gl_FragColor = vec4(uColor, alpha);
}
`;

const SUN_DIRECTION = new THREE.Vector3(0.6, 0.6, 0.5).normalize();

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(media.matches);

    update();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  return prefersReducedMotion;
}

function AtmosphereLayer({
  scale,
  opacity,
  power,
  intensity,
  reducedMotion,
}: {
  scale: number;
  opacity: number;
  power: number;
  intensity: number;
  reducedMotion: boolean;
}) {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        vertexShader: ATMOSPHERE_VERTEX_SHADER,
        fragmentShader: ATMOSPHERE_FRAGMENT_SHADER,
        uniforms: {
          uColor: { value: new THREE.Color(OB_COLORS.atmosphere) },
          uOpacity: { value: opacity },
          uPower: { value: power },
          uIntensity: { value: intensity },
          uPulseAmplitude: { value: reducedMotion ? 0 : 0.05 },
          uSunDirection: { value: SUN_DIRECTION.clone() },
          uTime: { value: 0 },
        },
      }),
    [opacity, power, intensity, reducedMotion]
  );

  useEffect(() => {
    materialRef.current = material;
    return () => material.dispose();
  }, [material]);

  useFrame((state) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value = reducedMotion ? 0 : state.clock.elapsedTime;
  });

  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS * scale, 64, 32]} />
      <primitive attach="material" object={material} />
    </mesh>
  );
}

/** Multi-layer Fresnel atmosphere: inner soft glow + outer diffuse haze. */
function Atmosphere({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <group>
      <AtmosphereLayer
        scale={1.045}
        opacity={0.24}
        power={2.2}
        intensity={0.95}
        reducedMotion={reducedMotion}
      />
      <AtmosphereLayer
        scale={1.095}
        opacity={0.16}
        power={3.4}
        intensity={0.8}
        reducedMotion={reducedMotion}
      />
    </group>
  );
}

/** The main earth sphere with canvas texture */
function EarthSphere() {
  const textures = useMemo(
    () => createEarthTextures(ne110mCoastlineSource, ne110mBoundarySource),
    []
  );

  return (
    <>
      {/* Solid globe with standard material for subtle shading */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 96, 48]} />
        <meshStandardMaterial
          map={textures.map}
          normalMap={textures.normalMap}
          normalScale={new THREE.Vector2(0.5, 0.5)}
          metalness={0.1}
          roughness={0.8}
          emissive={'#001826'}
          emissiveIntensity={0.2}
          toneMapped={false}
        />
      </mesh>
      {/* Thin rim wireframe overlay for technical aesthetic */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS * 1.002, 48, 24]} />
        <meshBasicMaterial color={OB_COLORS.cyan} wireframe transparent opacity={0.06} />
      </mesh>
    </>
  );
}

/** Get marker color based on severity */
function getMarkerColor(severity?: number, isFeatured?: boolean): string {
  if (isFeatured) return OB_COLORS.amber;
  if (severity === undefined) return OB_COLORS.cyan;
  if (severity >= 7) return OB_COLORS.danger;
  if (severity >= 4) return OB_COLORS.amber;
  return OB_COLORS.cyan;
}

/** A single event marker on the globe surface */
function EventMarker({
  event,
  isFeatured,
  onClick,
}: {
  event: Event;
  isFeatured: boolean;
  onClick: () => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const position = useMemo(() => {
    if (!event.location) return new THREE.Vector3(0, 0, 0);
    return latLonToVector3(event.location.lat, event.location.lon, GLOBE_RADIUS * 1.01);
  }, [event.location]);

  const color = getMarkerColor(event.severity, isFeatured);

  // Pulse animation for featured markers
  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (isFeatured) {
      const scale = 1 + Math.sin(clock.elapsedTime * 3) * 0.3;
      ref.current.scale.setScalar(scale);
    } else {
      ref.current.scale.setScalar(1);
    }
  });

  const size = isFeatured ? 0.025 : 0.015;

  return (
    <mesh
      ref={ref}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <sphereGeometry args={[size, 12, 12]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

/** Pulsing ring around event markers (Oblivion style) */
function EventRing({ event, isFeatured }: { event: Event; isFeatured: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const position = useMemo(() => {
    if (!event.location) return new THREE.Vector3(0, 0, 0);
    return latLonToVector3(event.location.lat, event.location.lon, GLOBE_RADIUS * 1.008);
  }, [event.location]);

  const color = getMarkerColor(event.severity, isFeatured);

  // LookAt center so the ring faces outward
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    const mat = new THREE.Matrix4().lookAt(
      position,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0)
    );
    q.setFromRotationMatrix(mat);
    return q;
  }, [position]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    // Pulsing ring expansion animation
    const pulse = (Math.sin(clock.elapsedTime * 2) + 1) / 2;
    const scale = isFeatured ? 1 + pulse * 0.8 : 1 + pulse * 0.3;
    ref.current.scale.setScalar(scale);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = isFeatured
      ? 0.5 - pulse * 0.3
      : 0.3 - pulse * 0.2;
  });

  return (
    <mesh ref={ref} position={position} quaternion={quaternion}>
      <ringGeometry args={[0.02, 0.035, 24]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={isFeatured ? 0.5 : 0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** Outer expanding ring for high-severity events */
function EventPulseRing({ event, isFeatured }: { event: Event; isFeatured: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const position = useMemo(() => {
    if (!event.location) return new THREE.Vector3(0, 0, 0);
    return latLonToVector3(event.location.lat, event.location.lon, GLOBE_RADIUS * 1.006);
  }, [event.location]);

  const color = getMarkerColor(event.severity, isFeatured);

  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    const mat = new THREE.Matrix4().lookAt(
      position,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0)
    );
    q.setFromRotationMatrix(mat);
    return q;
  }, [position]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    // Expanding ring animation (2 second cycle)
    const t = (clock.elapsedTime % 2) / 2;
    const scale = 1 + t * 2;
    ref.current.scale.setScalar(scale);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.4 * (1 - t);
  });

  // Only show for high severity or featured events
  if (!isFeatured && (event.severity === undefined || event.severity < 5)) {
    return null;
  }

  return (
    <mesh ref={ref} position={position} quaternion={quaternion}>
      <ringGeometry args={[0.03, 0.035, 24]} />
      <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** Pulsing home beacon at user's geolocation */
function HomeBeacon() {
  const userLat = useAppStore((state) => state.userLat);
  const userLon = useAppStore((state) => state.userLon);
  const geolocationStatus = useAppStore((state) => state.geolocationStatus);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const t = (clock.elapsedTime % 1.8) / 1.8;
    const scale = 1 + t * 3;
    ringRef.current.scale.setScalar(scale);
    (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - t);
  });

  if (geolocationStatus !== 'granted' || userLat === null || userLon === null) return null;

  const position = latLonToVector3(userLat, userLon, GLOBE_RADIUS + 0.005);

  return (
    <group position={position}>
      {/* Static dot */}
      <mesh>
        <sphereGeometry args={[0.012, 8, 8]} />
        <meshBasicMaterial color={OB_COLORS.cyan} />
      </mesh>
      {/* Expanding pulse ring */}
      <mesh ref={ringRef}>
        <ringGeometry args={[0.02, 0.024, 24]} />
        <meshBasicMaterial
          color={OB_COLORS.cyan}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/** Container that auto-rotates and holds the globe + markers */
function RotatingGlobe({ children, isPaused }: { children: React.ReactNode; isPaused: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const featuredEvent = useAppStore((state) => state.featuredEvent);
  const targetYRef = useRef<number | null>(null);

  // Read lon as a scalar so the effect dependency is a primitive (stable)
  const featuredLon = featuredEvent?.location?.lon;

  // When the featured event changes to one with a location, animate globe to center it
  useEffect(() => {
    if (featuredLon === undefined) return;
    targetYRef.current = lonToGlobeRotationY(featuredLon);
  }, [featuredLon]);

  useFrame((_, delta) => {
    if (!ref.current) return;

    if (targetYRef.current !== null) {
      // Smoothly interpolate towards the target rotation, taking the shortest path
      const diff = shortestAngleDiff(ref.current.rotation.y, targetYRef.current);
      if (Math.abs(diff) < ROTATION_CONVERGENCE_THRESHOLD) {
        ref.current.rotation.y += diff;
        targetYRef.current = null;
      } else {
        ref.current.rotation.y +=
          diff * Math.min(ROTATION_INTERPOLATION_SPEED * delta, MAX_ROTATION_STEP);
      }
    } else if (!isPaused) {
      ref.current.rotation.y += delta * 0.06;
    }
  });

  return <group ref={ref}>{children}</group>;
}

/** Speed multiplier for globe rotation animation (radians/second scale factor). */
const ROTATION_INTERPOLATION_SPEED = 2.5;

/** Maximum per-frame rotation step to prevent sudden jumps on low frame rates. */
const MAX_ROTATION_STEP = 0.25;

/** Convergence threshold (~0.3 degrees) below which rotation animation is considered complete. */
const ROTATION_CONVERGENCE_THRESHOLD = 0.005;

/**
 * Maximum number of markers to display simultaneously.
 * Events are deduplicated by proximity before this cap is applied.
 */
const MAX_MARKERS = 50;

/**
 * Minimum angular separation (radians) between two markers (~5 degrees).
 * Keeps markers readable without clustering them excessively.
 */
const MIN_MARKER_SEPARATION = (5 * Math.PI) / 180;

/**
 * Deduplicate events that are too close together on the globe surface.
 * Events are processed in priority order (caller responsibility). The first
 * event in each proximity cluster is kept; subsequent events within
 * MIN_MARKER_SEPARATION are suppressed.
 *
 * The featured event (if any) is always retained regardless of proximity.
 */
function deduplicateNearbyEvents(events: Event[], featuredId: string | undefined): Event[] {
  const positions: THREE.Vector3[] = [];
  const result: Event[] = [];

  for (const event of events) {
    if (!event.location) continue;

    const pos = latLonToVector3(event.location.lat, event.location.lon, 1);
    const isFeatured = event.id === featuredId;

    // Always include the featured event even if it would be suppressed
    const tooClose = !isFeatured && positions.some((p) => p.angleTo(pos) < MIN_MARKER_SEPARATION);

    if (!tooClose) {
      result.push(event);
      positions.push(pos);
    }

    if (result.length >= MAX_MARKERS) break;
  }

  return result;
}

/** All event markers as a group */
function EventMarkers() {
  const events = useAppStore((state) => state.events);
  const featuredEvent = useAppStore((state) => state.featuredEvent);
  const setFeaturedEvent = useAppStore((state) => state.setFeaturedEvent);
  const setSelectedEvent = useAppStore((state) => state.setSelectedEvent);

  const eventsWithLocations = useMemo(() => {
    // Sort: featured first, then by descending severity, then recency
    const withLoc = events.filter((e) => e.location);
    const featured = withLoc.filter((e) => e.id === featuredEvent?.id);
    const rest = withLoc
      .filter((e) => e.id !== featuredEvent?.id)
      .sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0) || b.timestamp - a.timestamp);
    return deduplicateNearbyEvents([...featured, ...rest], featuredEvent?.id);
  }, [events, featuredEvent?.id]);

  return (
    <group>
      {eventsWithLocations.map((event) => {
        const isFeatured = featuredEvent?.id === event.id;
        return (
          <group key={event.id}>
            <EventMarker
              event={event}
              isFeatured={isFeatured}
              onClick={() => {
                setFeaturedEvent(event);
                setSelectedEvent(event);
              }}
            />
            <EventRing event={event} isFeatured={isFeatured} />
            <EventPulseRing event={event} isFeatured={isFeatured} />
          </group>
        );
      })}
    </group>
  );
}

const GRATICULE_RADIUS = GLOBE_RADIUS * 1.003;
const GRATICULE_STEPS = 64;

function buildGraticulePositions(): Float32Array {
  const pts: number[] = [];

  // Parallels at every 30° latitude (skip poles)
  for (const lat of [-60, -30, 0, 30, 60]) {
    for (let i = 0; i < GRATICULE_STEPS; i++) {
      const lon1 = (i / GRATICULE_STEPS) * 360 - 180;
      const lon2 = ((i + 1) / GRATICULE_STEPS) * 360 - 180;
      const p1 = latLonToVector3(lat, lon1, GRATICULE_RADIUS);
      const p2 = latLonToVector3(lat, lon2, GRATICULE_RADIUS);
      pts.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    }
  }

  // Meridians at every 30° longitude
  for (let lon = -180; lon < 180; lon += 30) {
    for (let i = 0; i < GRATICULE_STEPS; i++) {
      const lat1 = (i / GRATICULE_STEPS) * 180 - 90;
      const lat2 = ((i + 1) / GRATICULE_STEPS) * 180 - 90;
      const p1 = latLonToVector3(lat1, lon, GRATICULE_RADIUS);
      const p2 = latLonToVector3(lat2, lon, GRATICULE_RADIUS);
      pts.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    }
  }

  return new Float32Array(pts);
}

/** Latitude/longitude graticule grid — subtle geographic reference lines */
function Graticule() {
  const positions = useMemo(() => buildGraticulePositions(), []);

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={positions.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color={OB_COLORS.cyan} transparent opacity={0.09} />
    </lineSegments>
  );
}

/** Small background stars for ambiance */
function Stars() {
  const positions = useMemo(() => {
    const arr = new Float32Array(800 * 3);
    /* eslint-disable react-hooks/purity -- decorative star positions generated once via useMemo([]) */
    for (let i = 0; i < 800; i++) {
      const r = 8 + Math.random() * 15;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    /* eslint-enable react-hooks/purity */
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={800}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color={OB_COLORS.stars} size={0.02} transparent opacity={0.3} />
    </points>
  );
}

/** Track camera distance and render city labels */
function CityLabelsWithTracking() {
  const featuredEvent = useAppStore((state) => state.featuredEvent);
  const { camera } = useThree();
  const [cameraDistance, setCameraDistance] = useState(2.4);

  // Track camera distance from origin on each frame
  useFrame(() => {
    const distance = camera.position.length();
    setCameraDistance(distance);
  });

  return (
    <CityLabels cameraDistance={cameraDistance} featuredEventLocation={featuredEvent?.location} />
  );
}

/** Main Globe component - fills its container (100vw x 100vh from Dashboard) */
export function Globe() {
  const [isInteracting, setIsInteracting] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const handlePointerDown = useCallback(() => setIsInteracting(true), []);
  const handlePointerUp = useCallback(() => {
    setTimeout(() => setIsInteracting(false), 2000);
  }, []);

  return (
    <div
      className="w-full h-full cursor-grab active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <Canvas
        camera={{ position: [0, 0.4, 2.6], fov: 45 }}
        style={{ background: 'transparent', width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} color={OB_COLORS.cyan} />
        <hemisphereLight args={['#102030', '#000000', 0.3]} />

        <Stars />
        <RotatingGlobe isPaused={isInteracting}>
          <EarthSphere />
          <Graticule />
          <Atmosphere reducedMotion={prefersReducedMotion} />
          <HomeBeacon />
          <EventMarkers />
          <CityLabelsWithTracking />
        </RotatingGlobe>
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={1.3}
          maxDistance={8}
          zoomSpeed={0.6}
        />
      </Canvas>
    </div>
  );
}
