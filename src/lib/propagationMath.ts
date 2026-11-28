export type PropagationModel = 'fspl' | 'two-ray';

export type ServiceProfileId = '5g' | 'wifi6' | 'lora' | 'ptp';

export type FresnelStatus = 'clear' | 'grazing' | 'blocked';

export type LinkQuality = 'excellent' | 'good' | 'marginal' | 'no-link';

export interface ObstacleAnalysis {
  hasObstacle: boolean;
  insideBuilding: boolean;
  obstacleT: number | null;
  obstacleHeightAtRayM: number | null;
  losHeightAtObstacleM: number | null;
  fresnelRadiusAtObstacleM: number;
  clearanceM: number;
  clearancePct: number;
  diffractionLossDb: number;
  penetrationLossDb: number;
  status: FresnelStatus;
}

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

/**
 * ITU-R P.526-15 single knife-edge diffraction loss J(nu) in dB (>= 0).
 */
export function knifeEdgeDiffractionLossDb(nu: number): number {
  if (nu <= -0.78) {
    return 0;
  }
  const v = nu - 0.1;
  return Math.max(0, 6.9 + 20 * Math.log10(Math.sqrt(v * v + 1) + v));
}

/**
 * First Fresnel zone ellipsoid radius r_F1 (m) at distances d1, d2 (m).
 */
export function fresnelRadiusMeters(
  d1M: number,
  d2M: number,
  wavelengthM: number,
): number {
  if (d1M <= 0 || d2M <= 0 || wavelengthM <= 0) {
    return 0;
  }
  return Math.sqrt((wavelengthM * d1M * d2M) / (d1M + d2M));
}

/**
 * Vertical-polarization Fresnel ground reflection coefficient Gamma_v.
 */
export function computeVerticalReflectionCoeff(
  sinPsi: number,
  cosPsi: number,
  epsilonR = 15,
): number {
  const root = Math.sqrt(Math.max(1e-6, epsilonR - cosPsi * cosPsi));
  return (epsilonR * sinPsi - root) / (epsilonR * sinPsi + root);
}

/**
 * Coherent 2-Ray ground-reflection amplitude delta relative to free space (dB).
 */
export function computeTwoRayDeltaDbFromLengths(
  r1M: number,
  r2M: number,
  txHeightM: number,
  rxHeightM: number,
  horizDistM: number,
  wavelengthM: number,
  reflectedPatternRatio: number,
): number {
  const safeR2 = Math.max(r2M, 1e-4);
  const sinPsi = (txHeightM + rxHeightM) / safeR2;
  const cosPsi = horizDistM / safeR2;
  const gamma = computeVerticalReflectionCoeff(sinPsi, cosPsi, 15);
  const deltaPhi = ((2 * Math.PI) / Math.max(wavelengthM, 1e-4)) * (r2M - r1M);
  const patRatio = clampNumber(reflectedPatternRatio, 0, 1.5);
  const coeff = gamma * (r1M / safeR2) * patRatio;
  const real = 1 + coeff * Math.cos(deltaPhi);
  const imag = -coeff * Math.sin(deltaPhi);
  const mag = Math.hypot(real, imag);
  return clampNumber(20 * Math.log10(Math.max(mag, 0.125)), -18, 6);
}

function makeClearObstacleAnalysis(): ObstacleAnalysis {
  return {
    hasObstacle: false,
    insideBuilding: false,
    obstacleT: null,
    obstacleHeightAtRayM: null,
    losHeightAtObstacleM: null,
    fresnelRadiusAtObstacleM: 0,
    clearanceM: Infinity,
    clearancePct: 100,
    diffractionLossDb: 0,
    penetrationLossDb: 0,
    status: 'clear',
  };
}

/**
 * Evaluates LOS clearance, 1st Fresnel zone radius, and ITU-R P.526 diffraction
 * or building penetration loss between TX at (0, txHeightM, 0) and RX at (rxX, rxHeightM, rxZ).
 */
export function evaluateObstacleGeometry(
  scenarioId: 'anechoic' | 'open-field' | 'urban' | 'ridge',
  obstacleDistanceM: number,
  obstacleHeightM: number,
  wavelengthM: number,
  txHeightM: number,
  rxX: number,
  rxZ: number,
  rxHeightM: number,
): ObstacleAnalysis {
  if (scenarioId === 'anechoic' || scenarioId === 'open-field') {
    return makeClearObstacleAnalysis();
  }

  const horizDist = Math.hypot(rxX, rxZ);
  if (horizDist < 0.1) {
    return makeClearObstacleAnalysis();
  }

  if (scenarioId === 'urban') {
    const minX = obstacleDistanceM - 3.2;
    const maxX = obstacleDistanceM + 3.2;
    const halfZ = 6.5;

    if (
      rxX >= minX &&
      rxX <= maxX &&
      Math.abs(rxZ) <= halfZ &&
      rxHeightM < obstacleHeightM
    ) {
      return {
        hasObstacle: true,
        insideBuilding: true,
        obstacleT: 1,
        obstacleHeightAtRayM: obstacleHeightM,
        losHeightAtObstacleM: rxHeightM,
        fresnelRadiusAtObstacleM: 0,
        clearanceM: rxHeightM - obstacleHeightM,
        clearancePct: -100,
        diffractionLossDb: 0,
        penetrationLossDb: 18,
        status: 'blocked',
      };
    }

    if (rxX <= minX) {
      return makeClearObstacleAnalysis();
    }

    const txMin = minX / rxX;
    const txMax = maxX / rxX;
    let tzMin = -Infinity;
    let tzMax = Infinity;
    if (Math.abs(rxZ) >= 1e-6) {
      const z1 = -halfZ / rxZ;
      const z2 = halfZ / rxZ;
      tzMin = Math.min(z1, z2);
      tzMax = Math.max(z1, z2);
    }

    const tEnter = Math.max(0, txMin, tzMin);
    const tExit = Math.min(1, txMax, tzMax);
    if (tExit <= tEnter || tEnter <= 0 || tEnter >= 1) {
      return makeClearObstacleAnalysis();
    }

    const tCenter = obstacleDistanceM / rxX;
    const tObs =
      tCenter > tEnter && tCenter < 1
        ? clampNumber(tCenter, 0.01, 0.99)
        : clampNumber(tEnter, 0.01, 0.99);

    const d1 = horizDist * tObs;
    const d2 = Math.max(0.05, horizDist - d1);
    const rF1 = fresnelRadiusMeters(d1, d2, wavelengthM);
    const losY = txHeightM + (rxHeightM - txHeightM) * tObs;
    const clearanceM = losY - obstacleHeightM;
    const nu = ((obstacleHeightM - losY) * Math.SQRT2) / Math.max(rF1, 1e-4);

    const zAtObs = Math.abs(rxZ * tObs);
    const edgeDist = halfZ - zAtObs;
    const lateralFactor =
      edgeDist >= rF1
        ? 1
        : 0.65 + 0.35 * clampNumber(edgeDist / Math.max(rF1, 1e-4), 0, 1);

    const rawDiff = knifeEdgeDiffractionLossDb(nu);
    const diffractionLossDb = Math.min(38, rawDiff * lateralFactor);
    const clearancePct =
      rF1 > 1e-4
        ? clampNumber((clearanceM / rF1) * 100, -300, 300)
        : clearanceM >= 0
          ? 100
          : -100;
    const status: FresnelStatus =
      clearanceM < 0 ? 'blocked' : clearancePct < 60 ? 'grazing' : 'clear';

    return {
      hasObstacle: true,
      insideBuilding: false,
      obstacleT: tObs,
      obstacleHeightAtRayM: obstacleHeightM,
      losHeightAtObstacleM: losY,
      fresnelRadiusAtObstacleM: rF1,
      clearanceM,
      clearancePct,
      diffractionLossDb,
      penetrationLossDb: 0,
      status,
    };
  }

  // Topographic Ridge scenario: Gaussian crest at x = obstacleDistanceM
  if (rxX <= obstacleDistanceM) {
    return makeClearObstacleAnalysis();
  }

  const tObs = obstacleDistanceM / rxX;
  if (tObs <= 0 || tObs >= 1) {
    return makeClearObstacleAnalysis();
  }

  const zAtObs = rxZ * tObs;
  const ridgeH = obstacleHeightM * Math.exp(-(zAtObs * zAtObs) / 180);
  if (ridgeH < 0.25) {
    return makeClearObstacleAnalysis();
  }

  const d1 = horizDist * tObs;
  const d2 = Math.max(0.05, horizDist - d1);
  const rF1 = fresnelRadiusMeters(d1, d2, wavelengthM);
  const losY = txHeightM + (rxHeightM - txHeightM) * tObs;
  const clearanceM = losY - ridgeH;
  const nu = ((ridgeH - losY) * Math.SQRT2) / Math.max(rF1, 1e-4);
  const diffractionLossDb = Math.min(38, knifeEdgeDiffractionLossDb(nu));
  const clearancePct =
    rF1 > 1e-4
      ? clampNumber((clearanceM / rF1) * 100, -300, 300)
      : clearanceM >= 0
        ? 100
        : -100;
  const status: FresnelStatus =
    clearanceM < 0 ? 'blocked' : clearancePct < 60 ? 'grazing' : 'clear';

  return {
    hasObstacle: true,
    insideBuilding: false,
    obstacleT: tObs,
    obstacleHeightAtRayM: ridgeH,
    losHeightAtObstacleM: losY,
    fresnelRadiusAtObstacleM: rF1,
    clearanceM,
    clearancePct,
    diffractionLossDb,
    penetrationLossDb: 0,
    status,
  };
}

/**
 * Maps DataTexture texel index (ix, iy) with flipY=false on PlaneGeometry rotated [-pi/2, 0, 0]
 * into world ground meters (xMeters, zMeters).
 */
export function texelToGroundMeters(
  ix: number,
  iy: number,
  texSize: number,
  groundSizeUnits: number,
  metersToScene: number,
): { xMeters: number; zMeters: number } {
  const u = (ix + 0.5) / texSize;
  const v = (iy + 0.5) / texSize;
  const worldXUnits = (u - 0.5) * groundSizeUnits;
  const worldZUnits = (0.5 - v) * groundSizeUnits;
  return {
    xMeters: worldXUnits / metersToScene,
    zMeters: worldZUnits / metersToScene,
  };
}
