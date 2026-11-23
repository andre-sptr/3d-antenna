import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { degToRad, type AntennaParams } from '../lib/antennaPhysics';

interface AntennaModels3DProps {
  params: AntennaParams;
  feedY: number;
}

export function AntennaModels3D({ params, feedY }: AntennaModels3DProps) {
  const dishGeometry = useMemo(() => {
    const points: THREE.Vector2[] = [];
    for (let i = 0; i <= 16; i++) {
      const r = (i / 16) * 0.52;
      const y = r * r * 0.72;
      points.push(new THREE.Vector2(r, y));
    }
    return new THREE.LatheGeometry(points, 28);
  }, []);

  useEffect(() => {
    return () => {
      dishGeometry.dispose();
    };
  }, [dishGeometry]);

  const directorCount = useMemo(() => {
    return Math.max(2, Math.min(7, Math.round((params.gainDbi - 5) / 1.6)));
  }, [params.gainDbi]);

  // Note: Three.js right-handed rotation around +Y: negative rotation.y turns +X toward +Z (clockwise from top)
  const yawRad = -degToRad(params.azimuthDeg);
  const tiltRad = -degToRad(params.downtiltDeg);

  return (
    <group position={[0, feedY, 0]} rotation={[0, yawRad, 0]}>
      <group rotation={[0, 0, tiltRad]}>
        {params.type === 'dipole' && (
          <group>
            {/* Upper & lower resonant dipole rods */}
            <mesh position={[0, 0.3, 0]}>
              <cylinderGeometry args={[0.022, 0.022, 0.52, 14]} />
              <meshStandardMaterial color="#D5E1ED" metalness={0.8} roughness={0.25} />
            </mesh>
            <mesh position={[0, -0.3, 0]}>
              <cylinderGeometry args={[0.022, 0.022, 0.52, 14]} />
              <meshStandardMaterial color="#D5E1ED" metalness={0.8} roughness={0.25} />
            </mesh>
            {/* Center feedpoint balun */}
            <mesh>
              <boxGeometry args={[0.1, 0.12, 0.1]} />
              <meshStandardMaterial color="#F4A940" roughness={0.45} metalness={0.2} />
            </mesh>
          </group>
        )}

        {params.type === 'omni' && (
          <group>
            {/* Fiberglass collinear radome */}
            <mesh position={[0, 0.42, 0]}>
              <cylinderGeometry args={[0.032, 0.042, 1.05, 16]} />
              <meshStandardMaterial color="#E2E8F0" roughness={0.35} metalness={0.1} />
            </mesh>
            <mesh position={[0, 0.96, 0]}>
              <sphereGeometry args={[0.036, 12, 12]} />
              <meshStandardMaterial color="#3DD6A4" emissive="#3DD6A4" emissiveIntensity={0.4} />
            </mesh>
            {/* 4 ground-plane radials */}
            {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((ang, idx) => (
              <mesh
                key={idx}
                position={[Math.cos(ang) * 0.16, -0.1, Math.sin(ang) * 0.16]}
                rotation={[Math.sin(ang) * 0.45, 0, -Math.cos(ang) * 0.45]}
              >
                <cylinderGeometry args={[0.01, 0.01, 0.34, 8]} />
                <meshStandardMaterial color="#94A3B8" metalness={0.8} roughness={0.3} />
              </mesh>
            ))}
          </group>
        )}

        {params.type === 'yagi' && (
          <group>
            {/* Main aluminum boom pointing along +X */}
            <mesh position={[0.32, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.022, 0.022, 1.28, 12]} />
              <meshStandardMaterial color="#9FB1C5" metalness={0.75} roughness={0.3} />
            </mesh>
            {/* Reflector */}
            <mesh position={[-0.24, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.014, 0.014, 0.78, 10]} />
              <meshStandardMaterial color="#D5E1ED" metalness={0.8} roughness={0.25} />
            </mesh>
            {/* Driven element */}
            <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.018, 0.018, 0.68, 10]} />
              <meshStandardMaterial color="#F4A940" metalness={0.45} roughness={0.35} />
            </mesh>
            {/* Parasitic directors */}
            {Array.from({ length: directorCount }, (_, idx) => {
              const x = 0.18 + idx * 0.13;
              const len = Math.max(0.32, 0.6 - idx * 0.045);
              return (
                <mesh key={idx} position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.012, 0.012, len, 10]} />
                  <meshStandardMaterial color="#D5E1ED" metalness={0.8} roughness={0.25} />
                </mesh>
              );
            })}
          </group>
        )}

        {params.type === 'patch' && (
          <group>
            {/* Aluminum ground plane */}
            <mesh position={[-0.04, 0, 0]}>
              <boxGeometry args={[0.03, 0.64, 0.64]} />
              <meshStandardMaterial color="#8EA1B7" metalness={0.8} roughness={0.28} />
            </mesh>
            {/* FR-4 dielectric substrate */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.04, 0.56, 0.56]} />
              <meshStandardMaterial color="#1F4D3E" roughness={0.75} />
            </mesh>
            {/* Copper radiating patch */}
            <mesh position={[0.025, 0, 0]}>
              <boxGeometry args={[0.014, 0.36, 0.36]} />
              <meshStandardMaterial color="#F4A940" metalness={0.75} roughness={0.25} />
            </mesh>
          </group>
        )}

        {params.type === 'dish' && (
          <group>
            {/* Parabolic reflector dish opening toward +X */}
            <mesh
              geometry={dishGeometry}
              position={[-0.1, 0, 0]}
              rotation={[0, 0, -Math.PI / 2]}
            >
              <meshStandardMaterial
                color="#CFD9E5"
                metalness={0.7}
                roughness={0.3}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* Feedhorn & waveguide */}
            <mesh position={[0.26, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.045, 0.065, 0.16, 16]} />
              <meshStandardMaterial color="#F4A940" metalness={0.45} roughness={0.35} />
            </mesh>
            {/* Tripod feed struts */}
            {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((ang, idx) => (
              <mesh
                key={idx}
                position={[0.1, Math.cos(ang) * 0.24, Math.sin(ang) * 0.24]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <cylinderGeometry args={[0.01, 0.01, 0.42, 8]} />
                <meshStandardMaterial color="#64748B" metalness={0.7} roughness={0.35} />
              </mesh>
            ))}
          </group>
        )}

        {params.type === 'sector' && (
          <group>
            {/* Vertical BTS sector radome */}
            <mesh position={[0.04, 0, 0]}>
              <boxGeometry args={[0.14, 0.96, 0.26]} />
              <meshStandardMaterial color="#D7E0EA" roughness={0.35} metalness={0.15} />
            </mesh>
            {/* Front boresight indicator strip */}
            <mesh position={[0.115, 0, 0]}>
              <boxGeometry args={[0.012, 0.82, 0.04]} />
              <meshStandardMaterial color="#3DD6A4" emissive="#3DD6A4" emissiveIntensity={0.45} />
            </mesh>
            {/* Rear tilt bracket */}
            <mesh position={[-0.08, 0, 0]}>
              <boxGeometry args={[0.12, 0.36, 0.12]} />
              <meshStandardMaterial color="#475569" metalness={0.65} roughness={0.4} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
}
