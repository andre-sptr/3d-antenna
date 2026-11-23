import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  dbiToRgb,
  degToRad,
  evaluatePatternLinear,
  linearToRadius,
  linearToRelativeDb,
  type AntennaParams,
  type ScaleMode,
} from '../lib/antennaPhysics';

interface RadiationLobeMeshProps {
  params: AntennaParams;
  scaleMode: ScaleMode;
  feedY: number;
  maxRadius: number;
  showWireframe: boolean;
  showEPlane: boolean;
  showHPlane: boolean;
}

const THETA_STEPS = 56;
const PHI_STEPS = 88;
const SLICE_SAMPLES = 180;

function populateLobeGeometry(
  geometry: THREE.BufferGeometry,
  params: AntennaParams,
  scaleMode: ScaleMode,
  maxRadius: number,
) {
  const vertexCount = (THETA_STEPS + 1) * (PHI_STEPS + 1);
  let posAttr = geometry.getAttribute('position') as
    | THREE.BufferAttribute
    | undefined;
  let colorAttr = geometry.getAttribute('color') as
    | THREE.BufferAttribute
    | undefined;

  if (!posAttr || posAttr.count !== vertexCount) {
    posAttr = new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3);
    colorAttr = new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3);
    geometry.setAttribute('position', posAttr);
    geometry.setAttribute('color', colorAttr);

    const indices: number[] = [];
    for (let it = 0; it < THETA_STEPS; it++) {
      for (let ip = 0; ip < PHI_STEPS; ip++) {
        const a = it * (PHI_STEPS + 1) + ip;
        const b = a + PHI_STEPS + 1;
        const c = a + 1;
        const d = b + 1;
        indices.push(a, b, c);
        indices.push(c, b, d);
      }
    }
    geometry.setIndex(indices);
  }

  const posArray = posAttr.array as Float32Array;
  const colorArray = (colorAttr as THREE.BufferAttribute).array as Float32Array;

  let vIdx = 0;
  for (let it = 0; it <= THETA_STEPS; it++) {
    const theta = (it / THETA_STEPS) * Math.PI;
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);

    for (let ip = 0; ip <= PHI_STEPS; ip++) {
      const phi = (ip / PHI_STEPS) * Math.PI * 2;
      const linear = evaluatePatternLinear(params, theta, phi);
      const radius = linearToRadius(linear, scaleMode) * maxRadius;
      const relDb = linearToRelativeDb(linear);
      const [r, g, b] = dbiToRgb(relDb);

      posArray[vIdx * 3] = radius * sinT * Math.cos(phi);
      posArray[vIdx * 3 + 1] = radius * cosT;
      posArray[vIdx * 3 + 2] = radius * sinT * Math.sin(phi);

      colorArray[vIdx * 3] = r;
      colorArray[vIdx * 3 + 1] = g;
      colorArray[vIdx * 3 + 2] = b;
      vIdx++;
    }
  }

  posAttr.needsUpdate = true;
  (colorAttr as THREE.BufferAttribute).needsUpdate = true;
  geometry.computeVertexNormals();
}

export function RadiationLobeMesh({
  params,
  scaleMode,
  feedY,
  maxRadius,
  showWireframe,
  showEPlane,
  showHPlane,
}: RadiationLobeMeshProps) {
  const lobeGeoRef = useRef<THREE.BufferGeometry>(null);
  const wireGeoRef = useRef<THREE.BufferGeometry>(null);
  const eGeoRef = useRef<THREE.BufferGeometry>(null);
  const hGeoRef = useRef<THREE.BufferGeometry>(null);

  const eLineObj = useMemo(() => new THREE.Line(), []);
  const hLineObj = useMemo(() => new THREE.Line(), []);

  useEffect(() => {
    if (lobeGeoRef.current) {
      populateLobeGeometry(lobeGeoRef.current, params, scaleMode, maxRadius);
    }
    if (showWireframe && wireGeoRef.current) {
      populateLobeGeometry(wireGeoRef.current, params, scaleMode, maxRadius * 1.004);
    }
  }, [params, scaleMode, maxRadius, showWireframe]);

  useEffect(() => {
    const azRad = degToRad(params.azimuthDeg);
    const tiltRad = degToRad(params.downtiltDeg);

    if (showEPlane && eGeoRef.current) {
      let attr = eGeoRef.current.getAttribute('position') as
        | THREE.BufferAttribute
        | undefined;
      if (!attr) {
        attr = new THREE.BufferAttribute(
          new Float32Array((SLICE_SAMPLES + 1) * 3),
          3,
        );
        eGeoRef.current.setAttribute('position', attr);
      }
      const arr = attr.array as Float32Array;
      for (let i = 0; i <= SLICE_SAMPLES; i++) {
        const ang = (i / SLICE_SAMPLES) * Math.PI * 2;
        const ux = Math.cos(ang) * Math.cos(azRad);
        const uy = Math.sin(ang);
        const uz = Math.cos(ang) * Math.sin(azRad);
        const theta = Math.acos(Math.min(1, Math.max(-1, uy)));
        const phi = Math.atan2(uz, ux);
        const r =
          linearToRadius(evaluatePatternLinear(params, theta, phi), scaleMode) *
          maxRadius *
          1.015;
        arr[i * 3] = ux * r;
        arr[i * 3 + 1] = uy * r;
        arr[i * 3 + 2] = uz * r;
      }
      attr.needsUpdate = true;
    }

    if (showHPlane && hGeoRef.current) {
      let attr = hGeoRef.current.getAttribute('position') as
        | THREE.BufferAttribute
        | undefined;
      if (!attr) {
        attr = new THREE.BufferAttribute(
          new Float32Array((SLICE_SAMPLES + 1) * 3),
          3,
        );
        hGeoRef.current.setAttribute('position', attr);
      }
      const arr = attr.array as Float32Array;
      for (let i = 0; i <= SLICE_SAMPLES; i++) {
        const phi = (i / SLICE_SAMPLES) * Math.PI * 2;
        const theta = Math.min(
          Math.PI - 0.001,
          Math.max(0.001, Math.PI / 2 + tiltRad * Math.cos(phi - azRad)),
        );
        const sinT = Math.sin(theta);
        const ux = sinT * Math.cos(phi);
        const uy = Math.cos(theta);
        const uz = sinT * Math.sin(phi);
        const r =
          linearToRadius(evaluatePatternLinear(params, theta, phi), scaleMode) *
          maxRadius *
          1.015;
        arr[i * 3] = ux * r;
        arr[i * 3 + 1] = uy * r;
        arr[i * 3 + 2] = uz * r;
      }
      attr.needsUpdate = true;
    }
  }, [params, scaleMode, maxRadius, showEPlane, showHPlane]);

  const yawRad = -degToRad(params.azimuthDeg);
  const tiltRad = -degToRad(params.downtiltDeg);

  return (
    <group position={[0, feedY, 0]}>
      {/* Main solid/translucent vertex-colored far-field lobe */}
      <mesh>
        <bufferGeometry ref={lobeGeoRef} />
        <meshStandardMaterial
          vertexColors
          transparent
          opacity={showEPlane || showHPlane ? 0.56 : 0.84}
          roughness={0.38}
          metalness={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Optional spherical contour wireframe shell */}
      {showWireframe && (
        <mesh>
          <bufferGeometry ref={wireGeoRef} />
          <meshBasicMaterial
            color="#94A3B8"
            wireframe
            transparent
            opacity={0.22}
          />
        </mesh>
      )}

      {/* E-Plane vertical cross-section cut (Peak Amber) */}
      {showEPlane && (
        <group>
          <primitive object={eLineObj}>
            <bufferGeometry ref={eGeoRef} attach="geometry" />
            <lineBasicMaterial attach="material" color="#F4A940" />
          </primitive>
          <mesh rotation={[0, yawRad, 0]}>
            <ringGeometry args={[0.15, maxRadius * 1.05, 64]} />
            <meshBasicMaterial
              color="#F4A940"
              transparent
              opacity={0.08}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {/* H-Plane horizontal cross-section cut (Phosphor Emerald) */}
      {showHPlane && (
        <group>
          <primitive object={hLineObj}>
            <bufferGeometry ref={hGeoRef} attach="geometry" />
            <lineBasicMaterial attach="material" color="#3DD6A4" />
          </primitive>
          <group rotation={[0, yawRad, 0]}>
            <mesh rotation={[0, 0, tiltRad]}>
              <cylinderGeometry
                args={[maxRadius * 1.05, maxRadius * 1.05, 0.012, 64, 1, true]}
              />
              <meshBasicMaterial
                color="#3DD6A4"
                transparent
                opacity={0.08}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
}
