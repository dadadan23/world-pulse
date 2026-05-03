import { useRef, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../../store/useAppStore';
import { createEarthTextures } from './textureRenderer';
import { latLonToVector3 } from './projection';
import { ne110mCoastlineSource } from './geoJsonCoastlineSource';
import { CityLabels } from './CityLabels';
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

/** Atmosphere glow rendered on the backside of a slightly larger sphere */
function Atmosphere() {
  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS * 1.06, 64, 32]} />
      <meshBasicMaterial
        color={OB_COLORS.atmosphere}
        transparent
        opacity={0.15}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

/** Outer atmosphere ring for additional depth */
function AtmosphereRing() {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[GLOBE_RADIUS * 1.02, GLOBE_RADIUS * 1.12, 64]} />
      <meshBasicMaterial
        color={OB_COLORS.cyan}
        transparent
        opacity={0.12}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** The main earth sphere with canvas texture */
function EarthSphere() {
  const textures = useMemo(() => createEarthTextures(ne110mCoastlineSource), []);

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

  useFrame((_, delta) => {
    if (ref.current && !isPaused) {
      ref.current.rotation.y += delta * 0.06;
    }
  });

  return <group ref={ref}>{children}</group>;
}

/** All event markers as a group */
function EventMarkers() {
  const events = useAppStore((state) => state.events);
  const featuredEvent = useAppStore((state) => state.featuredEvent);
  const setFeaturedEvent = useAppStore((state) => state.setFeaturedEvent);
  const setSelectedEvent = useAppStore((state) => state.setSelectedEvent);

  const eventsWithLocations = useMemo(
    () => events.filter((e) => e.location).slice(0, 30),
    [events]
  );

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

/** Small background stars for ambiance */
function Stars() {
  const positions = useMemo(() => {
    const arr = new Float32Array(800 * 3);
    for (let i = 0; i < 800; i++) {
      const r = 8 + Math.random() * 15;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={800} itemSize={3} />
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
          <Atmosphere />
          <AtmosphereRing />
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
