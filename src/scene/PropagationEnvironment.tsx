import { useEffect, useMemo, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { Theme } from '../hooks/useTheme';
import type {
  AntennaParams,
  PropagationModel,
  ScenarioConfig,
} from '../lib/antennaPhysics';
import { clampNumber } from '../lib/propagationMath';
import { fillGroundHeatmapBuffer } from '../lib/propagationPhysics';

interface PropagationEnvironmentProps {
  params: AntennaParams;
  scenario: ScenarioConfig;
  propagationModel: PropagationModel;
  feedY: number;
  showPolarCage: boolean;
  theme: Theme;
  onSelectGroundPoint?: (xMeters: number, zMeters: number) => void;
}

export const METERS_TO_SCENE = 0.32;
const GROUND_SIZE_UNITS = 24; // 75m x 75m field span
const HEATMAP_TEX_SIZE = 192;

export function PropagationEnvironment({
  params,
  scenario,
  propagationModel,
  feedY,
  showPolarCage,
  theme,
  onSelectGroundPoint,
}: PropagationEnvironmentProps) {
  const ridgeGeoRef = useRef<THREE.PlaneGeometry>(null);
  const groundTexRef = useRef<THREE.DataTexture>(null);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);

  const isLight = theme === 'light';
  const palette = useMemo(
    () => ({
      axisColor: isLight ? '#64748B' : '#475B73',
      cagePrimary: isLight ? '#1A9E72' : '#3DD6A4',
      cageSecondary: isLight ? '#64748B' : '#586E87',
      gridMajor: isLight ? '#94A3B8' : '#33465B',
      gridMinor: isLight ? '#CBD5E1' : '#1C2836',
      mastColor: isLight ? '#64748B' : '#7B90A6',
      baseColor: isLight ? '#94A3B8' : '#273445',
      buildingWall: isLight ? '#64748B' : '#263344',
      buildingCap: isLight ? '#94A3B8' : '#586E87',
      ridgeColor: isLight ? '#5C6F82' : '#202D3D',
    }),
    [isLight],
  );

  const groundTexArgs = useMemo<
    [Uint8Array, number, number, THREE.PixelFormat]
  >(
    () => [
      new Uint8Array(HEATMAP_TEX_SIZE * HEATMAP_TEX_SIZE * 4),
      HEATMAP_TEX_SIZE,
      HEATMAP_TEX_SIZE,
      THREE.RGBAFormat,
    ],
    [],
  );

  const axisLineX = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-4.2, 0, 0),
      new THREE.Vector3(4.2, 0, 0),
    ]);
    return new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({ color: '#475B73', transparent: true, opacity: 0.6 }),
    );
  }, []);

  const axisLineZ = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -4.2),
      new THREE.Vector3(0, 0, 4.2),
    ]);
    return new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({ color: '#475B73', transparent: true, opacity: 0.6 }),
    );
  }, []);

  const axisLineY = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -3.8, 0),
      new THREE.Vector3(0, 3.8, 0),
    ]);
    return new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({ color: '#475B73', transparent: true, opacity: 0.6 }),
    );
  }, []);

  useEffect(() => {
    (axisLineX.material as THREE.LineBasicMaterial).color.set(palette.axisColor);
    (axisLineZ.material as THREE.LineBasicMaterial).color.set(palette.axisColor);
    (axisLineY.material as THREE.LineBasicMaterial).color.set(palette.axisColor);
  }, [palette.axisColor, axisLineX, axisLineZ, axisLineY]);

  useEffect(() => {
    return () => {
      axisLineX.geometry.dispose();
      (axisLineX.material as THREE.Material).dispose();
      axisLineZ.geometry.dispose();
      (axisLineZ.material as THREE.Material).dispose();
      axisLineY.geometry.dispose();
      (axisLineY.material as THREE.Material).dispose();
    };
  }, [axisLineX, axisLineZ, axisLineY]);

  useEffect(() => {
    const tex = groundTexRef.current;
    if (scenario.id === 'anechoic' || !tex) {
      return;
    }
    const data = tex.image.data as Uint8Array;
    fillGroundHeatmapBuffer(
      data,
      HEATMAP_TEX_SIZE,
      GROUND_SIZE_UNITS,
      METERS_TO_SCENE,
      params,
      scenario,
      propagationModel,
    );
    tex.needsUpdate = true;
  }, [params, scenario, propagationModel]);

  useEffect(() => {
    if (scenario.id !== 'ridge' || !ridgeGeoRef.current) {
      return;
    }
    const pos = ridgeGeoRef.current.getAttribute(
      'position',
    ) as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const localX = pos.getX(i);
      const localY = pos.getY(i);
      const xDrop = Math.exp(-(localX * localX) / 4.5);
      const zMeters = -localY / METERS_TO_SCENE;
      const heightM =
        scenario.obstacleHeightM * Math.exp(-(zMeters * zMeters) / 180) * xDrop;
      pos.setZ(i, heightM * METERS_TO_SCENE);
    }
    pos.needsUpdate = true;
    ridgeGeoRef.current.computeVertexNormals();
  }, [scenario.id, scenario.obstacleHeightM]);

  const handleGroundPointerDown = (event: ThreeEvent<PointerEvent>) => {
    pointerDownRef.current = { x: event.clientX, y: event.clientY };
  };

  const handleGroundPointerUp = (event: ThreeEvent<PointerEvent>) => {
    const start = pointerDownRef.current;
    pointerDownRef.current = null;
    if (!start || !onSelectGroundPoint) {
      return;
    }
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 5) {
      return;
    }
    const xMeters =
      Math.round(clampNumber(event.point.x / METERS_TO_SCENE, -36, 36) * 2) / 2;
    const zMeters =
      Math.round(clampNumber(event.point.z / METERS_TO_SCENE, -36, 36) * 2) / 2;
    onSelectGroundPoint(xMeters, zMeters);
  };

  const obstacleXUnits = scenario.obstacleDistanceM * METERS_TO_SCENE;
  const obstacleHUnits = scenario.obstacleHeightM * METERS_TO_SCENE;

  return (
    <group>
      {/* Calibrated spherical coordinate cage around the antenna feedpoint */}
      {showPolarCage && (
        <group position={[0, feedY, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[3.55, 3.6, 96]} />
            <meshBasicMaterial
              color={palette.cagePrimary}
              transparent
              opacity={isLight ? 0.45 : 0.32}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.78, 1.81, 72]} />
            <meshBasicMaterial
              color={palette.cageSecondary}
              transparent
              opacity={isLight ? 0.42 : 0.35}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh>
            <ringGeometry args={[3.55, 3.59, 96]} />
            <meshBasicMaterial
              color={palette.cageSecondary}
              transparent
              opacity={isLight ? 0.32 : 0.22}
              side={THREE.DoubleSide}
            />
          </mesh>
          <primitive object={axisLineX} />
          <primitive object={axisLineZ} />
          <primitive object={axisLineY} />
        </group>
      )}

      {/* Field Tower, Ground Signal Heatmap, and Obstacles */}
      {scenario.id !== 'anechoic' && (
        <group>
          {/* High-resolution 192x192 DataTexture Ground Footprint Heatmap */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.01, 0]}
            onPointerDown={handleGroundPointerDown}
            onPointerUp={handleGroundPointerUp}
          >
            <planeGeometry args={[GROUND_SIZE_UNITS, GROUND_SIZE_UNITS, 1, 1]} />
            <meshBasicMaterial
              transparent
              opacity={isLight ? 0.82 : 0.88}
            >
              <dataTexture
                ref={groundTexRef}
                attach="map"
                args={groundTexArgs}
                colorSpace={THREE.SRGBColorSpace}
                magFilter={THREE.LinearFilter}
                minFilter={THREE.LinearFilter}
                generateMipmaps={false}
                flipY={false}
              />
            </meshBasicMaterial>
          </mesh>

          {/* Subtle calibrated ground perimeter frame */}
          <gridHelper
            key={theme}
            args={[GROUND_SIZE_UNITS, 12, palette.gridMajor, palette.gridMinor]}
            position={[0, 0.03, 0]}
          />

          {/* Steel Tower Mast supporting the antenna */}
          <mesh position={[0, feedY / 2, 0]}>
            <cylinderGeometry args={[0.07, 0.14, Math.max(0.4, feedY), 10]} />
            <meshStandardMaterial
              color={palette.mastColor}
              metalness={0.65}
              roughness={0.35}
            />
          </mesh>
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[0.75, 0.16, 0.75]} />
            <meshStandardMaterial color={palette.baseColor} roughness={0.85} />
          </mesh>

          {/* Urban Concrete Building Obstacle */}
          {scenario.id === 'urban' && (
            <group position={[obstacleXUnits, obstacleHUnits / 2, 0]}>
              <mesh>
                <boxGeometry args={[2.05, obstacleHUnits, 4.16]} />
                <meshStandardMaterial
                  color={palette.buildingWall}
                  roughness={0.78}
                  metalness={0.12}
                />
              </mesh>
              <mesh position={[0, obstacleHUnits / 2 + 0.02, 0]}>
                <boxGeometry args={[2.1, 0.06, 4.22]} />
                <meshStandardMaterial color={palette.buildingCap} roughness={0.5} />
              </mesh>
            </group>
          )}

          {/* Sloped Topographic Ridge Crest */}
          {scenario.id === 'ridge' && (
            <mesh
              position={[obstacleXUnits, 0.02, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry ref={ridgeGeoRef} args={[5.5, 22, 24, 36]} />
              <meshStandardMaterial
                color={palette.ridgeColor}
                roughness={0.9}
                flatShading
              />
            </mesh>
          )}
        </group>
      )}
    </group>
  );
}
