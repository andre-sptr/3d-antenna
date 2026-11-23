export const SPEED_OF_LIGHT_M_S = 299_792_458;

export type AntennaType =
  | 'dipole'
  | 'omni'
  | 'yagi'
  | 'patch'
  | 'dish'
  | 'sector';

export type ScaleMode = 'log' | 'linear';

export type ScenarioId = 'anechoic' | 'open-field' | 'urban' | 'ridge';

export type SectorBeamwidthDeg = 65 | 90 | 120;

export interface AntennaParams {
  type: AntennaType;
  frequencyMHz: number;
  gainDbi: number;
  txPowerDbm: number;
  azimuthDeg: number;
  downtiltDeg: number;
  sectorBeamwidthDeg: SectorBeamwidthDeg;
}

export interface ScenarioConfig {
  id: ScenarioId;
  towerHeightM: number;
  obstacleDistanceM: number;
  obstacleHeightM: number;
}

export interface AntennaPresetMeta {
  id: AntennaType;
  name: string;
  shortName: string;
  defaultGainDbi: number;
  minGainDbi: number;
  maxGainDbi: number;
  gainStepDbi: number;
  defaultFreqMHz: number;
  summary: string;
}

export interface AntennaMetrics {
  wavelengthM: number;
  quarterWaveM: number;
  azimuthHpbwDeg: number;
  elevationHpbwDeg: number;
  frontToBackDb: number;
  peakEirpDbm: number;
}

export interface PolarSample {
  angleDeg: number;
  linear: number;
  relativeDb: number;
}

export const ANTENNA_CATALOG: Record<AntennaType, AntennaPresetMeta> = {
  dipole: {
    id: 'dipole',
    name: 'Half-Wave Dipole',
    shortName: 'Dipole',
    defaultGainDbi: 2.15,
    minGainDbi: 2.15,
    maxGainDbi: 2.15,
    gainStepDbi: 0.05,
    defaultFreqMHz: 146.52,
    summary: 'Reference resonant element with omnidirectional azimuth coverage and zenith nulls.',
  },
  omni: {
    id: 'omni',
    name: 'Collinear Omni',
    shortName: 'Omni',
    defaultGainDbi: 6.0,
    minGainDbi: 3.0,
    maxGainDbi: 12.0,
    gainStepDbi: 0.5,
    defaultFreqMHz: 433.92,
    summary: 'Stacked vertical collinear elements compress the horizon lobe and introduce vertical sidelobes.',
  },
  yagi: {
    id: 'yagi',
    name: 'Yagi-Uda Array',
    shortName: 'Yagi',
    defaultGainDbi: 11.0,
    minGainDbi: 7.0,
    maxGainDbi: 15.0,
    gainStepDbi: 0.5,
    defaultFreqMHz: 433.92,
    summary: 'Parasitic reflector and directors concentrate energy along the forward boom axis.',
  },
  patch: {
    id: 'patch',
    name: 'Microstrip Patch',
    shortName: 'Patch',
    defaultGainDbi: 8.0,
    minGainDbi: 6.0,
    maxGainDbi: 10.0,
    gainStepDbi: 0.5,
    defaultFreqMHz: 2437,
    summary: 'Planar radiator over a ground plane offering a clean broadside lobe and strong rear isolation.',
  },
  dish: {
    id: 'dish',
    name: 'Parabolic Dish',
    shortName: 'Dish',
    defaultGainDbi: 24.0,
    minGainDbi: 18.0,
    maxGainDbi: 30.0,
    gainStepDbi: 1.0,
    defaultFreqMHz: 5800,
    summary: 'Circular aperture producing an Airy pencil beam with narrow main lobe and concentric sidelobe rings.',
  },
  sector: {
    id: 'sector',
    name: 'Sectoral BTS Panel',
    shortName: 'Sector',
    defaultGainDbi: 16.0,
    minGainDbi: 12.0,
    maxGainDbi: 19.0,
    gainStepDbi: 0.5,
    defaultFreqMHz: 2437,
    summary: 'Base-station phased panel with selectable azimuth sector width and vertical downtilt steering.',
  },
};

export const ANTENNA_LIST: readonly AntennaPresetMeta[] = [
  ANTENNA_CATALOG.dipole,
  ANTENNA_CATALOG.omni,
  ANTENNA_CATALOG.yagi,
  ANTENNA_CATALOG.patch,
  ANTENNA_CATALOG.dish,
  ANTENNA_CATALOG.sector,
];

export const FREQUENCY_PRESETS = [
  { label: '146 MHz', valueMHz: 146.52 },
  { label: '433 MHz', valueMHz: 433.92 },
  { label: '915 MHz', valueMHz: 915 },
  { label: '2.4 GHz', valueMHz: 2437 },
  { label: '5.8 GHz', valueMHz: 5800 },
] as const;

export const SCENARIO_LIST: readonly {
  id: ScenarioId;
  label: string;
  description: string;
}[] = [
  {
    id: 'anechoic',
    label: 'Anechoic Chamber',
    description: 'Isolated free-space test range with compass azimuth ring and elevation arcs.',
  },
  {
    id: 'open-field',
    label: 'Open Field Tower',
    description: 'Elevated mast radiating onto a flat ground footprint signal heatmap (dBm).',
  },
  {
    id: 'urban',
    label: 'Urban Blockage',
    description: 'Concrete building along the boresight corridor casting a ground RF shadow.',
  },
  {
    id: 'ridge',
    label: 'Ridge Crest',
    description: 'Topographic ridge evaluating line-of-sight clearance versus terrain diffraction loss.',
  },
] as const;

export const DEFAULT_ANTENNA_PARAMS: AntennaParams = {
  type: 'sector',
  frequencyMHz: 2437,
  gainDbi: 16.0,
  txPowerDbm: 30,
  azimuthDeg: 0,
  downtiltDeg: 6,
  sectorBeamwidthDeg: 90,
};

export const DEFAULT_SCENARIO: ScenarioConfig = {
  id: 'open-field',
  towerHeightM: 18,
  obstacleDistanceM: 18,
  obstacleHeightM: 14,
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * First-order Bessel function of the first kind J1(x),
 * used for circular parabolic aperture Airy diffraction patterns.
 */
export function besselJ1(x: number): number {
  const ax = Math.abs(x);
  if (ax < 8.0) {
    const y = x * x;
    const ans1 =
      x *
      (72362614232.0 +
        y *
          (-7895059235.0 +
            y *
              (242396853.1 +
                y *
                  (-2972611.439 +
                    y * (15704.4826 + y * -30.16036606)))));
    const ans2 =
      144725228442.0 +
      y *
        (2300535178.0 +
          y *
            (18583304.74 +
              y * (99447.43394 + y * (376.9991397 + y * 1.0))));
    return ans1 / ans2;
  }
  const z = 8.0 / ax;
  const y = z * z;
  const xx = ax - 2.356194491;
  const ans1 =
    1.0 +
    y *
      (0.183105e-2 +
        y * (-0.3516396496e-4 + y * (0.2457520174e-5 + y * -0.240337019e-6)));
  const ans2 =
    0.04687499995 +
    y *
      (-0.2002690873e-3 +
        y * (0.8449199096e-5 + y * (-0.88228987e-6 + y * 0.105787412e-6)));
  const ans =
    Math.sqrt(0.636619772 / ax) *
    (Math.cos(xx) * ans1 - z * Math.sin(xx) * ans2);
  return x < 0 ? -ans : ans;
}

/**
 * Evaluates normalized far-field amplitude F(theta, phi) in [0, 1].
 * World frame: +Y zenith, +X east (azimuth 0 deg), +Z south (azimuth 90 deg).
 */
export function evaluatePatternLinear(
  params: AntennaParams,
  thetaRad: number,
  phiRad: number,
): number {
  const sinTheta = Math.sin(thetaRad);
  const ux = sinTheta * Math.cos(phiRad);
  const uy = Math.cos(thetaRad);
  const uz = sinTheta * Math.sin(phiRad);

  // Rotate world ray into antenna-local frame (undo azimuth yaw, then undo downtilt pitch)
  const azRad = degToRad(params.azimuthDeg);
  const cosAz = Math.cos(azRad);
  const sinAz = Math.sin(azRad);
  const x1 = ux * cosAz + uz * sinAz;
  const z1 = -ux * sinAz + uz * cosAz;
  const y1 = uy;

  const tiltRad = degToRad(params.downtiltDeg);
  const cosTilt = Math.cos(tiltRad);
  const sinTilt = Math.sin(tiltRad);
  const lx = x1 * cosTilt - y1 * sinTilt;
  const ly = x1 * sinTilt + y1 * cosTilt;
  const lz = z1;

  const cosThetaLoc = clamp(ly, -1, 1);
  const sinThetaLoc = Math.hypot(lx, lz);
  const cosPsi = clamp(lx, -1, 1);
  const psi = Math.acos(cosPsi);

  switch (params.type) {
    case 'dipole': {
      if (sinThetaLoc < 1e-4) {
        return 0;
      }
      const val = Math.abs(
        Math.cos((Math.PI / 2) * cosThetaLoc) / sinThetaLoc,
      );
      return clamp(val, 0, 1);
    }

    case 'omni': {
      if (sinThetaLoc < 1e-4) {
        return 0;
      }
      const elementFactor = Math.abs(
        Math.cos((Math.PI / 2) * cosThetaLoc) / sinThetaLoc,
      );
      const elementCount = Math.max(
        2,
        Math.round(Math.pow(10, (params.gainDbi - 2.15) / 10) + 0.5),
      );
      const psiArray = (Math.PI / 2) * cosThetaLoc;
      const denom = Math.sin(psiArray);
      const arrayFactor =
        Math.abs(denom) < 1e-5
          ? 1
          : Math.abs(Math.sin(elementCount * psiArray) / (elementCount * denom));
      return clamp(elementFactor * arrayFactor, 0, 1);
    }

    case 'yagi': {
      const exponent = 1.6 + Math.max(0, params.gainDbi - 7) * 0.55;
      const fbDb = 14 + Math.max(0, params.gainDbi - 7) * 1.0;
      const backFloor = Math.pow(10, -fbDb / 20);
      const main = Math.pow(Math.max(0, Math.cos(psi / 2)), exponent);
      const sidelobe =
        psi > Math.PI / 3
          ? 0.14 * Math.abs(Math.sin(psi * 2.5)) * Math.sin(psi)
          : 0;
      return clamp(Math.max(backFloor, main + sidelobe), 0, 1);
    }

    case 'patch': {
      const q = 1.1 + Math.max(0, params.gainDbi - 6) * 0.35;
      if (lx >= 0) {
        const front = Math.pow(lx, q * 0.7);
        return clamp(Math.max(0.08, front), 0, 1);
      }
      const rear = 0.08 * (0.35 + 0.65 * (1 + lx));
      return clamp(rear, 0, 1);
    }

    case 'dish': {
      // Aperture parameter ka = pi * D / lambda derived from G = eta * ka^2 (eta = 0.6)
      const gainLinear = Math.pow(10, params.gainDbi / 10);
      const ka = Math.sqrt(gainLinear / 0.6);
      const backFloor = 0.035; // ~ -29 dB back-lobe isolation
      if (lx <= 0) {
        return backFloor;
      }
      const u = ka * Math.sin(psi);
      const airy = u < 1e-4 ? 1 : Math.abs((2 * besselJ1(u)) / u);
      return clamp(Math.max(backFloor, airy), 0, 1);
    }

    case 'sector': {
      const azLocalDeg = radToDeg(Math.atan2(lz, lx));
      const elLocalDeg = radToDeg(Math.asin(cosThetaLoc));

      const halfAzBw = params.sectorBeamwidthDeg / 2;
      const azRatio = azLocalDeg / halfAzBw;
      let azGain = Math.pow(10, -0.15 * azRatio * azRatio);
      if (Math.abs(azLocalDeg) > 95) {
        azGain = Math.max(0.06, azGain);
      }

      const elHpbw = Math.max(6.5, 16.0 - (params.gainDbi - 12) * 1.3);
      const uEl = (elLocalDeg / (elHpbw * 0.5)) * 1.39156;
      const elSinc =
        Math.abs(uEl) < 1e-4 ? 1 : Math.abs(Math.sin(uEl) / uEl);
      const elFloor = 0.05;
      const elGain = Math.max(elFloor, elSinc);

      return clamp(Math.max(0.05, azGain * elGain), 0, 1);
    }
  }
}

export function linearToRelativeDb(
  linearField: number,
  floorDb = -25,
): number {
  if (linearField <= 0) {
    return floorDb;
  }
  const db = 20 * Math.log10(linearField);
  return clamp(db, floorDb, 0);
}

export function linearToRadius(
  linearField: number,
  scaleMode: ScaleMode,
  floorDb = -25,
): number {
  if (scaleMode === 'linear') {
    return clamp(0.04 + linearField * linearField * 0.96, 0.04, 1);
  }
  const relDb = linearToRelativeDb(linearField, floorDb);
  const norm = (relDb - floorDb) / (0 - floorDb);
  return clamp(0.05 + norm * 0.95, 0.05, 1);
}

export function calculateWavelengthMeters(frequencyMHz: number): number {
  return SPEED_OF_LIGHT_M_S / (Math.max(1, frequencyMHz) * 1_000_000);
}

export function samplePolarCut(
  params: AntennaParams,
  plane: 'h' | 'e',
  steps = 180,
): PolarSample[] {
  const samples: PolarSample[] = [];
  const azRad = degToRad(params.azimuthDeg);
  const tiltRad = degToRad(params.downtiltDeg);

  for (let i = 0; i <= steps; i++) {
    const angleDeg = (i / steps) * 360;
    const rad = degToRad(angleDeg);

    let linear: number;
    if (plane === 'h') {
      // Horizontal plane at current downtilt horizon slice
      const x = Math.cos(rad);
      const z = Math.sin(rad);
      const theta = Math.PI / 2 + tiltRad * Math.cos(rad - azRad);
      const phi = Math.atan2(z, x);
      linear = evaluatePatternLinear(params, clamp(theta, 0.001, Math.PI - 0.001), phi);
    } else {
      // Vertical E-plane containing azimuth boresight (angle 0 = +boresight horizon, 90 = zenith)
      const ux = Math.cos(rad) * Math.cos(azRad);
      const uy = Math.sin(rad);
      const uz = Math.cos(rad) * Math.sin(azRad);
      const theta = Math.acos(clamp(uy, -1, 1));
      const phi = Math.atan2(uz, ux);
      linear = evaluatePatternLinear(params, theta, phi);
    }

    samples.push({
      angleDeg,
      linear,
      relativeDb: linearToRelativeDb(linear),
    });
  }

  return samples;
}

function measureHpbwDeg(
  evalAtOffsetDeg: (offsetDeg: number) => number,
): number {
  const halfPowerField = Math.SQRT1_2; // -3 dB power => 0.7071 field
  const step = 0.5;
  let posEdge = 180;
  let negEdge = -180;

  for (let d = step; d <= 180; d += step) {
    if (evalAtOffsetDeg(d) < halfPowerField) {
      posEdge = d;
      break;
    }
  }
  for (let d = -step; d >= -180; d -= step) {
    if (evalAtOffsetDeg(d) < halfPowerField) {
      negEdge = d;
      break;
    }
  }

  if (posEdge === 180 && negEdge === -180) {
    return 360;
  }
  return Math.round((posEdge - negEdge) * 10) / 10;
}

export function computeAntennaMetrics(params: AntennaParams): AntennaMetrics {
  const azRad = degToRad(params.azimuthDeg);
  const tiltRad = degToRad(params.downtiltDeg);
  const boresightTheta = clamp(Math.PI / 2 + tiltRad, 0.01, Math.PI - 0.01);

  const azimuthHpbwDeg = measureHpbwDeg((offsetDeg) =>
    evaluatePatternLinear(params, boresightTheta, azRad + degToRad(offsetDeg)),
  );

  const elevationHpbwDeg = measureHpbwDeg((offsetDeg) => {
    const elRad = degToRad(-params.downtiltDeg + offsetDeg);
    const ux = Math.cos(elRad) * Math.cos(azRad);
    const uy = Math.sin(elRad);
    const uz = Math.cos(elRad) * Math.sin(azRad);
    const theta = Math.acos(clamp(uy, -1, 1));
    const phi = Math.atan2(uz, ux);
    return evaluatePatternLinear(params, theta, phi);
  });

  const frontField = evaluatePatternLinear(params, boresightTheta, azRad);
  const backField = evaluatePatternLinear(
    params,
    clamp(Math.PI - boresightTheta, 0.01, Math.PI - 0.01),
    azRad + Math.PI,
  );
  const frontToBackDb =
    Math.round(
      20 * Math.log10(Math.max(frontField, 1e-4) / Math.max(backField, 1e-4)) * 10,
    ) / 10;

  const wavelengthM = calculateWavelengthMeters(params.frequencyMHz);

  return {
    wavelengthM,
    quarterWaveM: wavelengthM / 4,
    azimuthHpbwDeg,
    elevationHpbwDeg,
    frontToBackDb: Math.max(0, frontToBackDb),
    peakEirpDbm: Math.round((params.txPowerDbm + params.gainDbi) * 10) / 10,
  };
}

/**
 * Evaluates received ground signal strength (dBm) at world coordinates (xMeters, zMeters)
 * for a transmitter at (0, towerHeightM, 0) and receiver height 1.5 m.
 */
export function evaluateGroundFieldDbm(
  params: AntennaParams,
  scenario: ScenarioConfig,
  xMeters: number,
  zMeters: number,
): number {
  const rxHeightM = 1.5;
  const dx = xMeters;
  const dy = rxHeightM - scenario.towerHeightM;
  const dz = zMeters;
  const distM = Math.max(1.5, Math.hypot(dx, dy, dz));

  const ux = dx / distM;
  const uy = dy / distM;
  const uz = dz / distM;

  const theta = Math.acos(clamp(uy, -1, 1));
  const phi = Math.atan2(uz, ux);
  const patternField = evaluatePatternLinear(params, theta, phi);
  const patternLossDb = -20 * Math.log10(Math.max(patternField, 0.004));

  const fsplDb =
    32.44 +
    20 * Math.log10(Math.max(distM / 1000, 0.0015)) +
    20 * Math.log10(params.frequencyMHz);

  let obstacleLossDb = 0;

  if (scenario.id === 'urban') {
    const buildingMinX = scenario.obstacleDistanceM - 3.2;
    const buildingMaxX = scenario.obstacleDistanceM + 3.2;
    const buildingHalfZ = 6.5;

    if (dx > buildingMinX) {
      // Check ray intersection across building face at x = buildingMinX
      const tEnter = buildingMinX / Math.max(dx, 1e-4);
      const tExit = Math.min(1, buildingMaxX / Math.max(dx, 1e-4));
      if (tEnter > 0 && tEnter < 1) {
        const zAtWall = dz * tEnter;
        const yAtWall = scenario.towerHeightM + dy * tEnter;
        if (Math.abs(zAtWall) <= buildingHalfZ && yAtWall < scenario.obstacleHeightM) {
          const depthRatio = clamp((scenario.obstacleHeightM - yAtWall) / 10, 0.15, 1);
          const edgeBlend = clamp(
            1 - (Math.abs(zAtWall) / buildingHalfZ) * 0.25,
            0.5,
            1,
          );
          const spanScale = tExit > tEnter ? 1 : 0.7;
          obstacleLossDb = (14 + 12 * depthRatio) * edgeBlend * spanScale;
        }
      }
    }
  } else if (scenario.id === 'ridge') {
    const ridgeX = scenario.obstacleDistanceM;
    if (dx > ridgeX) {
      const tRidge = ridgeX / Math.max(dx, 1e-4);
      if (tRidge > 0 && tRidge < 1) {
        const zAtRidge = dz * tRidge;
        const yAtRidge = scenario.towerHeightM + dy * tRidge;
        const ridgeHeight =
          scenario.obstacleHeightM * Math.exp(-(zAtRidge * zAtRidge) / 180);
        if (yAtRidge < ridgeHeight) {
          const blockageM = ridgeHeight - yAtRidge;
          obstacleLossDb = clamp(6 + blockageM * 1.4, 6, 22);
        }
      }
    }
  }

  return (
    params.txPowerDbm +
    params.gainDbi -
    patternLossDb -
    fsplDb -
    obstacleLossDb
  );
}

/**
 * 5-stop scientific RGB colormap for 3D radiation lobe surfaces (values in 0..1).
 * Stops: -25 dB (#182A44) -> -14 dB (#246B8F) -> -6 dB (#3DD6A4) -> -1.5 dB (#F4A940) -> 0 dB (#FFF3D6)
 */
const COLOR_STOPS: ReadonlyArray<{ t: number; rgb: [number, number, number] }> = [
  { t: 0.0, rgb: [0.094, 0.165, 0.267] },
  { t: 0.44, rgb: [0.141, 0.42, 0.561] },
  { t: 0.76, rgb: [0.239, 0.839, 0.643] },
  { t: 0.94, rgb: [0.957, 0.663, 0.251] },
  { t: 1.0, rgb: [1.0, 0.953, 0.839] },
];

function interpolateStops(tRaw: number): [number, number, number] {
  const t = clamp(tRaw, 0, 1);
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const a = COLOR_STOPS[i];
    const b = COLOR_STOPS[i + 1];
    if (t <= b.t) {
      const local = (t - a.t) / Math.max(1e-5, b.t - a.t);
      return [
        a.rgb[0] + (b.rgb[0] - a.rgb[0]) * local,
        a.rgb[1] + (b.rgb[1] - a.rgb[1]) * local,
        a.rgb[2] + (b.rgb[2] - a.rgb[2]) * local,
      ];
    }
  }
  return COLOR_STOPS[COLOR_STOPS.length - 1].rgb;
}

export function dbiToRgb(
  relativeDb: number,
  floorDb = -25,
): [number, number, number] {
  const t = (relativeDb - floorDb) / (0 - floorDb);
  return interpolateStops(t);
}

export function groundFieldToRgb(rxDbm: number): [number, number, number] {
  const minDbm = -105;
  const maxDbm = -38;
  const t = (rxDbm - minDbm) / (maxDbm - minDbm);
  return interpolateStops(t);
}
