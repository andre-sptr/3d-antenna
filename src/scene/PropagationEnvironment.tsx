import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  evaluateGroundFieldDbm,
  groundFieldToRgb,
  type AntennaParams,
  type ScenarioConfig,
} from '../lib/antennaPhysics';

interface PropagationEnvironmentProps {
  params: AntennaParams;
  scenario: ScenarioConfig;
  feedY: number;
  showPolarCage: boolean;
}

export const METERS_TO_SCENE = 0.32;
const GROUND_SIZE_UNITS = 24; // 75m x 75m field span
const GROUND_SEGMENTS = 64;

export function PropagationEnvironment({
  params,
  scenario,
  feedY,
  showPolarCage,
}: PropagationEnvironmentProps) {
  const groundGeoRef = useRef<THREE.PlaneGeometry>(null);
  const ridgeGeoRef = useRef<THREE.PlaneGeometry>(null);

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
    if (scenario.id === 'anechoic' || !groundGeoRef.current) {
      return;
    }

    const posAttr = groundGeoRef.current.getAttribute(
      'position',
    ) as THREE.BufferAttribute;
    let colorAttr = groundGeoRef.current.getAttribute('color') as
      | THREE.BufferAttribute
      | undefined;

    if (!colorAttr || colorAttr.count !== posAttr.count) {
      colorAttr = new THREE.BufferAttribute(
        new Float32Array(posAttr.count * 3),
        3,
      );
      groundGeoRef.current.setAttribute('color', colorAttr);
    }

    const colorArray = colorAttr.array as Float32Array;
    for (let i = 0; i < posAttr.count; i++) {
      // PlaneGeometry lies in local XY before -90deg X rotation: local X -> world X, local Y -> world -Z
      const worldXUnits = posAttr.getX(i);
      const worldZUnits = -posAttr.getY(i);
      const xMeters = worldXUnits / METERS_TO_SCENE;
      const zMeters = worldZUnits / METERS_TO_SCENE;
      const rxDbm = evaluateGroundFieldDbm(params, scenario, xMeters, zMeters);
      const [r, g, b] = groundFieldToRgb(rxDbm);
      colorArray[i * 3] = r;
      colorArray[i * 3 + 1] = g;
      colorArray[i * 3 + 2] = b;
    }

    colorAttr.needsUpdate = true;
  }, [params, scenario]);

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
              color="#3DD6A4"
              transparent
              opacity={0.32}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.78, 1.81, 72]} />
            <meshBasicMaterial
              color="#586E87"
              transparent
              opacity={0.35}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh>
            <ringGeometry args={[3.55, 3.59, 96]} />
            <meshBasicMaterial
              color="#586E87"
              transparent
              opacity={0.22}
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
          {/* Ground Footprint Coverage Heatmap */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <planeGeometry
              ref={groundGeoRef}
              args={[
                GROUND_SIZE_UNITS,
                GROUND_SIZE_UNITS,
                GROUND_SEGMENTS,
                GROUND_SEGMENTS,
              ]}
            />
            <meshBasicMaterial vertexColors transparent opacity={0.86} />
          </mesh>

          {/* Subtle calibrated ground perimeter frame */}
          <gridHelper
            args={[GROUND_SIZE_UNITS, 12, '#33465B', '#1C2836']}
            position={[0, 0.03, 0]}
          />

          {/* Steel Tower Mast supporting the antenna */}
          <mesh position={[0, feedY / 2, 0]}>
            <cylinderGeometry args={[0.07, 0.14, Math.max(0.4, feedY), 10]} />
            <meshStandardMaterial
              color="#7B90A6"
              metalness={0.65}
              roughness={0.35}
            />
          </mesh>
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[0.75, 0.16, 0.75]} />
            <meshStandardMaterial color="#273445" roughness={0.85} />
          </mesh>

          {/* Urban Concrete Building Obstacle */}
          {scenario.id === 'urban' && (
            <group position={[obstacleXUnits, obstacleHUnits / 2, 0]}>
              <mesh>
                <boxGeometry args={[2.05, obstacleHUnits, 4.16]} />
                <meshStandardMaterial
                  color="#263344"
                  roughness={0.78}
                  metalness={0.12}
                />
              </mesh>
              <mesh position={[0, obstacleHUnits / 2 + 0.02, 0]}>
                <boxGeometry args={[2.1, 0.06, 4.22]} />
                <meshStandardMaterial color="#586E87" roughness={0.5} />
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
                color="#202D3D"
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
