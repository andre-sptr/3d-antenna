import { useEffect, useMemo, useRef, useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { Theme } from '../hooks/useTheme';
import {
  fresnelRadiusMeters,
  type FresnelStatus,
  type RxProbeConfig,
} from '../lib/antennaPhysics';
import { clampNumber } from '../lib/propagationMath';
import type { LinkBudgetResult } from '../lib/propagationPhysics';
import { METERS_TO_SCENE } from './PropagationEnvironment';

interface RxProbe3DProps {
  rxProbe: RxProbeConfig;
  linkBudget: LinkBudgetResult;
  feedY: number;
  wavelengthM: number;
  theme: Theme;
  onMoveProbe: (xMeters: number, zMeters: number) => void;
  onDragStateChange: (dragging: boolean) => void;
}

const FRESNEL_LEN_STEPS = 32;
const FRESNEL_RAD_STEPS = 24;
const UP_AXIS = new THREE.Vector3(0, 1, 0);

function getStatusColor(status: FresnelStatus, theme: Theme): string {
  const isLight = theme === 'light';
  switch (status) {
    case 'clear':
      return isLight ? '#148F66' : '#3DD6A4';
    case 'grazing':
      return isLight ? '#C47E14' : '#F4A940';
    case 'blocked':
      return isLight ? '#D13834' : '#F25F5C';
  }
}

export function RxProbe3D({
  rxProbe,
  linkBudget,
  feedY,
  wavelengthM,
  theme,
  onMoveProbe,
  onDragStateChange,
}: RxProbe3DProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fresnelGeoRef = useRef<THREE.BufferGeometry>(null);

  const statusColor = getStatusColor(linkBudget.fresnelStatus, theme);
  const rxX = rxProbe.xMeters * METERS_TO_SCENE;
  const rxY = Math.max(0.16, rxProbe.rxHeightM * METERS_TO_SCENE);
  const rxZ = rxProbe.zMeters * METERS_TO_SCENE;

  const dxU = rxX;
  const dyU = rxY - feedY;
  const dzU = rxZ;
  const slantUnits = Math.hypot(dxU, dyU, dzU);
  const slantMeters = slantUnits / METERS_TO_SCENE;

  const rayQuaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    if (slantUnits > 1e-4) {
      const dir = new THREE.Vector3(dxU, dyU, dzU).normalize();
      q.setFromUnitVectors(UP_AXIS, dir);
    }
    return q;
  }, [dxU, dyU, dzU, slantUnits]);

  const losLine = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0),
    ]);
    const mat = new THREE.LineBasicMaterial({
      color: '#3DD6A4',
      transparent: true,
      opacity: 0.9,
    });
    return new THREE.Line(geo, mat);
  }, []);

  useEffect(() => {
    return () => {
      losLine.geometry.dispose();
      (losLine.material as THREE.Material).dispose();
    };
  }, [losLine]);

  useEffect(() => {
    const pos = losLine.geometry.getAttribute('position') as THREE.BufferAttribute;
    pos.setXYZ(0, 0, 0, 0);
    pos.setXYZ(1, 0, slantUnits, 0);
    pos.needsUpdate = true;
    (losLine.material as THREE.LineBasicMaterial).color.set(statusColor);
  }, [losLine, slantUnits, statusColor]);

  useEffect(() => {
    if (!rxProbe.showFresnel || !fresnelGeoRef.current || slantUnits <= 0.25) {
      return;
    }

    const geo = fresnelGeoRef.current;
    const vertexCount = (FRESNEL_LEN_STEPS + 1) * (FRESNEL_RAD_STEPS + 1);
    let posAttr = geo.getAttribute('position') as THREE.BufferAttribute | undefined;

    if (!posAttr || posAttr.count !== vertexCount) {
      posAttr = new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3);
      geo.setAttribute('position', posAttr);
      const indices: number[] = [];
      for (let il = 0; il < FRESNEL_LEN_STEPS; il++) {
        for (let ir = 0; ir < FRESNEL_RAD_STEPS; ir++) {
          const a = il * (FRESNEL_RAD_STEPS + 1) + ir;
          const b = a + FRESNEL_RAD_STEPS + 1;
          const c = a + 1;
          const d = b + 1;
          indices.push(a, b, c);
          indices.push(c, b, d);
        }
      }
      geo.setIndex(indices);
    }

    const arr = posAttr.array as Float32Array;
    let idx = 0;
    for (let il = 0; il <= FRESNEL_LEN_STEPS; il++) {
      const t = il / FRESNEL_LEN_STEPS;
      const y = t * slantUnits;
      const d1 = t * slantMeters;
      const d2 = (1 - t) * slantMeters;
      const r = fresnelRadiusMeters(d1, d2, wavelengthM) * METERS_TO_SCENE;

      for (let ir = 0; ir <= FRESNEL_RAD_STEPS; ir++) {
        const phi = (ir / FRESNEL_RAD_STEPS) * Math.PI * 2;
        arr[idx++] = r * Math.cos(phi);
        arr[idx++] = y;
        arr[idx++] = r * Math.sin(phi);
      }
    }

    posAttr.needsUpdate = true;
    geo.computeVertexNormals();
  }, [rxProbe.showFresnel, slantUnits, slantMeters, wavelengthM]);

  useEffect(() => {
    if (!isDragging) {
      return;
    }
    const stopDrag = () => {
      setIsDragging(false);
      onDragStateChange(false);
      document.body.style.cursor = '';
    };
    window.addEventListener('pointerup', stopDrag);
    window.addEventListener('pointercancel', stopDrag);
    return () => {
      window.removeEventListener('pointerup', stopDrag);
      window.removeEventListener('pointercancel', stopDrag);
    };
  }, [isDragging, onDragStateChange]);

  useEffect(() => {
    return () => {
      onDragStateChange(false);
      document.body.style.cursor = '';
    };
  }, [onDragStateChange]);

  const handleProbePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setIsDragging(true);
    onDragStateChange(true);
    document.body.style.cursor = 'grabbing';
  };

  const handleDragMove = (event: ThreeEvent<PointerEvent>) => {
    if (!isDragging) {
      return;
    }
    event.stopPropagation();
    const xMeters =
      Math.round(clampNumber(event.point.x / METERS_TO_SCENE, -36, 36) * 2) / 2;
    const zMeters =
      Math.round(clampNumber(event.point.z / METERS_TO_SCENE, -36, 36) * 2) / 2;
    onMoveProbe(xMeters, zMeters);
  };

  const handleDragEnd = (event: ThreeEvent<PointerEvent>) => {
    if (!isDragging) {
      return;
    }
    event.stopPropagation();
    setIsDragging(false);
    onDragStateChange(false);
    document.body.style.cursor = '';
  };

  const ringFractions = [0.25, 0.5, 0.75];
  const obstacleRingRadius =
    linkBudget.obstacleT !== null && linkBudget.obstacleT > 0.02 && linkBudget.obstacleT < 0.98
      ? fresnelRadiusMeters(
          linkBudget.obstacleT * slantMeters,
          (1 - linkBudget.obstacleT) * slantMeters,
          wavelengthM,
        ) * METERS_TO_SCENE
      : 0;

  return (
    <group>
      {/* Draggable RX Probe Marker Assembly */}
      <group position={[rxX, 0, rxZ]}>
        {/* Ground Target Reticle */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <ringGeometry args={[0.24, 0.34, 32]} />
          <meshBasicMaterial
            color={statusColor}
            transparent
            opacity={0.92}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <ringGeometry args={[0.45, 0.5, 32]} />
          <meshBasicMaterial
            color={statusColor}
            transparent
            opacity={0.45}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Receiver Mast */}
        <mesh position={[0, rxY / 2, 0]}>
          <cylinderGeometry args={[0.032, 0.045, rxY, 10]} />
          <meshStandardMaterial
            color={theme === 'light' ? '#475569' : '#94A3B8'}
            metalness={0.6}
            roughness={0.35}
          />
        </mesh>

        {/* Sensor Tip & Dipole Element */}
        <mesh position={[0, rxY, 0]}>
          <sphereGeometry args={[0.11, 16, 16]} />
          <meshStandardMaterial
            color={statusColor}
            emissive={statusColor}
            emissiveIntensity={isDragging ? 0.85 : 0.45}
            roughness={0.25}
          />
        </mesh>
        <mesh position={[0, rxY + 0.14, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 0.24, 8]} />
          <meshStandardMaterial color={statusColor} metalness={0.4} roughness={0.3} />
        </mesh>

        {/* Invisible Generous Grab Hit-Box */}
        <mesh
          position={[0, Math.max(0.6, rxY * 0.55), 0]}
          onPointerOver={(e) => {
            e.stopPropagation();
            if (!isDragging) document.body.style.cursor = 'grab';
          }}
          onPointerOut={() => {
            if (!isDragging) document.body.style.cursor = '';
          }}
          onPointerDown={handleProbePointerDown}
        >
          <cylinderGeometry args={[0.45, 0.45, Math.max(1.2, rxY + 0.5), 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>

      {/* Active Ground Drag Plane while dragging RX Probe */}
      {isDragging && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.02, 0]}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
        >
          <planeGeometry args={[52, 52]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      {/* LOS Ray & 1st Fresnel Zone Ellipsoid */}
      {rxProbe.showFresnel && slantUnits > 0.25 && (
        <group position={[0, feedY, 0]} quaternion={rayQuaternion}>
          <primitive object={losLine} />

          <mesh>
            <bufferGeometry ref={fresnelGeoRef} />
            <meshBasicMaterial
              color={statusColor}
              transparent
              opacity={0.16}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>

          {ringFractions.map((t) => {
            const r =
              fresnelRadiusMeters(t * slantMeters, (1 - t) * slantMeters, wavelengthM) *
              METERS_TO_SCENE;
            if (r < 0.02) return null;
            return (
              <mesh
                key={t}
                position={[0, t * slantUnits, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <ringGeometry args={[Math.max(0.01, r - 0.018), r, 40]} />
                <meshBasicMaterial
                  color={statusColor}
                  transparent
                  opacity={0.42}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                />
              </mesh>
            );
          })}

          {obstacleRingRadius > 0.02 && linkBudget.obstacleT !== null && (
            <mesh
              position={[0, linkBudget.obstacleT * slantUnits, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <ringGeometry
                args={[
                  Math.max(0.01, obstacleRingRadius - 0.032),
                  obstacleRingRadius + 0.012,
                  48,
                ]}
              />
              <meshBasicMaterial
                color={statusColor}
                transparent
                opacity={0.85}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          )}
        </group>
      )}
    </group>
  );
}
