import { useEffect, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { degToRad } from '../lib/antennaPhysics';

export type CameraPresetId = 'iso' | 'top' | 'side' | 'boresight' | 'reset';

interface CameraRigProps {
  presetRequest: { preset: CameraPresetId; seq: number };
  feedY: number;
  azimuthDeg: number;
  isAnechoic: boolean;
  autoOrbit: boolean;
  prefersReducedMotion: boolean;
  enabled?: boolean;
}

export function CameraRig({
  presetRequest,
  feedY,
  azimuthDeg,
  isAnechoic,
  autoOrbit,
  prefersReducedMotion,
  enabled = true,
}: CameraRigProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();

  const animatingRef = useRef(false);
  const desiredPosRef = useRef(new THREE.Vector3(6.2, 4.0, 6.8));
  const desiredTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const feedYRef = useRef(feedY);
  const azimuthRef = useRef(azimuthDeg);

  useEffect(() => {
    feedYRef.current = feedY;
    azimuthRef.current = azimuthDeg;
  }, [feedY, azimuthDeg]);

  useEffect(() => {
    const azRad = degToRad(azimuthRef.current);
    const curFeedY = feedYRef.current;
    const lookY = isAnechoic ? 0 : curFeedY * 0.52;
    const baseDist = isAnechoic ? 8.8 : 13.8;

    switch (presetRequest.preset) {
      case 'top':
        desiredPosRef.current.set(0.01, curFeedY + baseDist * 1.25, 0.01);
        desiredTargetRef.current.set(0, lookY, 0);
        break;
      case 'side':
        desiredPosRef.current.set(0.8, curFeedY + 0.6, baseDist * 1.05);
        desiredTargetRef.current.set(isAnechoic ? 0 : 1.5, lookY, 0);
        break;
      case 'boresight':
        desiredPosRef.current.set(
          Math.cos(azRad) * baseDist * 0.95,
          curFeedY + 1.4,
          Math.sin(azRad) * baseDist * 0.95,
        );
        desiredTargetRef.current.set(0, curFeedY * 0.75, 0);
        break;
      case 'iso':
      case 'reset':
      default:
        desiredPosRef.current.set(
          baseDist * 0.68,
          curFeedY + baseDist * 0.42,
          baseDist * 0.74,
        );
        desiredTargetRef.current.set(isAnechoic ? 0 : 1.2, lookY, 0);
        break;
    }

    animatingRef.current = true;
  }, [presetRequest, isAnechoic]);

  useFrame((_state, delta) => {
    if (!animatingRef.current || !controlsRef.current) {
      return;
    }
    const alpha = prefersReducedMotion ? 1 : 1 - Math.exp(-delta * 6.5);
    camera.position.lerp(desiredPosRef.current, alpha);
    controlsRef.current.target.lerp(desiredTargetRef.current, alpha);
    controlsRef.current.update();

    if (
      camera.position.distanceTo(desiredPosRef.current) < 0.03 &&
      controlsRef.current.target.distanceTo(desiredTargetRef.current) < 0.03
    ) {
      animatingRef.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={enabled}
      enableDamping
      dampingFactor={0.08}
      minDistance={2.8}
      maxDistance={28}
      maxPolarAngle={isAnechoic ? Math.PI : Math.PI / 2 - 0.03}
      autoRotate={autoOrbit && !prefersReducedMotion}
      autoRotateSpeed={0.85}
      onStart={() => {
        animatingRef.current = false;
      }}
    />
  );
}
