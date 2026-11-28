import {
  SERVICE_PROFILES,
  calculateWavelengthMeters,
  computeTwoRayDeltaDbFromLengths,
  degToRad,
  evaluateObstacleGeometry,
  evaluatePatternFromDirection,
  fresnelRadiusMeters,
  groundFieldToRgb,
  radToDeg,
  type AntennaParams,
  type FresnelStatus,
  type LinkQuality,
  type PropagationModel,
  type RxProbeConfig,
  type ScenarioConfig,
} from './antennaPhysics';
import { texelToGroundMeters } from './propagationMath';

export interface LinkBudgetResult {
  horizontalDistanceM: number;
  slantDistanceM: number;
  bearingDeg: number;
  elevationAngleDeg: number;
  eirpDbm: number;
  txPatternLossDb: number;
  fsplDb: number;
  twoRayDeltaDb: number;
  diffractionLossDb: number;
  penetrationLossDb: number;
  rxGainDbi: number;
  rxPowerDbm: number;
  sensitivityDbm: number;
  fadeMarginDb: number;
  linkQuality: LinkQuality;
  fresnelMaxRadiusM: number;
  fresnelObstacleRadiusM: number;
  fresnelClearanceM: number;
  fresnelClearancePct: number;
  fresnelStatus: FresnelStatus;
  obstacleT: number | null;
  obstacleHeightAtRayM: number | null;
  losHeightAtObstacleM: number | null;
  insideBuilding: boolean;
}

export function evaluateLinkBudget(
  params: AntennaParams,
  scenario: ScenarioConfig,
  probe: RxProbeConfig,
  propagationModel: PropagationModel,
): LinkBudgetResult {
  const dx = probe.xMeters;
  const dy = probe.rxHeightM - scenario.towerHeightM;
  const dz = probe.zMeters;
  const horizontalDistanceM = Math.hypot(dx, dz);
  const slantDistanceM = Math.max(1.5, Math.hypot(dx, dy, dz));

  const azRad = degToRad(params.azimuthDeg);
  const tiltRad = degToRad(params.downtiltDeg);
  const cosAz = Math.cos(azRad);
  const sinAz = Math.sin(azRad);
  const cosTilt = Math.cos(tiltRad);
  const sinTilt = Math.sin(tiltRad);

  const patternField = evaluatePatternFromDirection(
    params,
    dx / slantDistanceM,
    dy / slantDistanceM,
    dz / slantDistanceM,
    cosAz,
    sinAz,
    cosTilt,
    sinTilt,
  );
  const txPatternLossDb = -20 * Math.log10(Math.max(patternField, 0.004));

  const fsplDb =
    32.44 +
    20 * Math.log10(Math.max(slantDistanceM / 1000, 0.0015)) +
    20 * Math.log10(params.frequencyMHz);

  const wavelengthM = calculateWavelengthMeters(params.frequencyMHz);
  const obstacle = evaluateObstacleGeometry(
    scenario.id,
    scenario.obstacleDistanceM,
    scenario.obstacleHeightM,
    wavelengthM,
    scenario.towerHeightM,
    probe.xMeters,
    probe.zMeters,
    probe.rxHeightM,
  );

  let twoRayDeltaDb = 0;
  if (
    propagationModel === 'two-ray' &&
    !obstacle.insideBuilding &&
    horizontalDistanceM > 0.25
  ) {
    const refDy = -(scenario.towerHeightM + probe.rxHeightM);
    const r2M = Math.max(1.5, Math.hypot(dx, refDy, dz));
    const reflField = evaluatePatternFromDirection(
      params,
      dx / r2M,
      refDy / r2M,
      dz / r2M,
      cosAz,
      sinAz,
      cosTilt,
      sinTilt,
    );
    const shadowScale = obstacle.diffractionLossDb > 6 ? 0.25 : 1;
    const reflectedRatio =
      (Math.max(reflField, 0.004) / Math.max(patternField, 0.004)) * shadowScale;
    twoRayDeltaDb = computeTwoRayDeltaDbFromLengths(
      slantDistanceM,
      r2M,
      scenario.towerHeightM,
      probe.rxHeightM,
      horizontalDistanceM,
      wavelengthM,
      reflectedRatio,
    );
  }

  const eirpDbm = params.txPowerDbm + params.gainDbi;
  const rxPowerDbm =
    eirpDbm -
    txPatternLossDb -
    fsplDb +
    twoRayDeltaDb -
    obstacle.diffractionLossDb -
    obstacle.penetrationLossDb +
    probe.rxGainDbi;

  const sensitivityDbm = SERVICE_PROFILES[probe.serviceProfile].sensitivityDbm;
  const fadeMarginDb = rxPowerDbm - sensitivityDbm;
  const linkQuality: LinkQuality =
    fadeMarginDb >= 20
      ? 'excellent'
      : fadeMarginDb >= 10
        ? 'good'
        : fadeMarginDb >= 0
          ? 'marginal'
          : 'no-link';

  const bearingDeg = (radToDeg(Math.atan2(dz, dx)) + 360) % 360;
  const elevationAngleDeg = radToDeg(
    Math.atan2(dy, Math.max(horizontalDistanceM, 1e-4)),
  );
  const fresnelMaxRadiusM = fresnelRadiusMeters(
    slantDistanceM / 2,
    slantDistanceM / 2,
    wavelengthM,
  );

  return {
    horizontalDistanceM,
    slantDistanceM,
    bearingDeg,
    elevationAngleDeg,
    eirpDbm,
    txPatternLossDb,
    fsplDb,
    twoRayDeltaDb,
    diffractionLossDb: obstacle.diffractionLossDb,
    penetrationLossDb: obstacle.penetrationLossDb,
    rxGainDbi: probe.rxGainDbi,
    rxPowerDbm,
    sensitivityDbm,
    fadeMarginDb,
    linkQuality,
    fresnelMaxRadiusM,
    fresnelObstacleRadiusM: obstacle.fresnelRadiusAtObstacleM,
    fresnelClearanceM: obstacle.clearanceM,
    fresnelClearancePct: obstacle.clearancePct,
    fresnelStatus: obstacle.status,
    obstacleT: obstacle.obstacleT,
    obstacleHeightAtRayM: obstacle.obstacleHeightAtRayM,
    losHeightAtObstacleM: obstacle.losHeightAtObstacleM,
    insideBuilding: obstacle.insideBuilding,
  };
}

/**
 * Fills an RGBA Uint8Array buffer for a square DataTexture ground footprint heatmap.
 * Uses identical propagation physics as evaluateGroundFieldDbm / evaluateLinkBudget.
 */
export function fillGroundHeatmapBuffer(
  buffer: Uint8Array,
  texSize: number,
  groundSizeUnits: number,
  metersToScene: number,
  params: AntennaParams,
  scenario: ScenarioConfig,
  propagationModel: PropagationModel,
  rxHeightM = 1.5,
): void {
  const azRad = degToRad(params.azimuthDeg);
  const tiltRad = degToRad(params.downtiltDeg);
  const cosAz = Math.cos(azRad);
  const sinAz = Math.sin(azRad);
  const cosTilt = Math.cos(tiltRad);
  const sinTilt = Math.sin(tiltRad);

  const wavelengthM = calculateWavelengthMeters(params.frequencyMHz);
  const eirpDbm = params.txPowerDbm + params.gainDbi;
  const fsplFreqConst = 32.44 + 20 * Math.log10(params.frequencyMHz);
  const dy = rxHeightM - scenario.towerHeightM;
  const refDy = -(scenario.towerHeightM + rxHeightM);
  const isTwoRay = propagationModel === 'two-ray';

  let ptr = 0;
  for (let iy = 0; iy < texSize; iy++) {
    for (let ix = 0; ix < texSize; ix++) {
      const { xMeters, zMeters } = texelToGroundMeters(
        ix,
        iy,
        texSize,
        groundSizeUnits,
        metersToScene,
      );
      const horizDistM = Math.hypot(xMeters, zMeters);
      const distM = Math.max(1.5, Math.hypot(xMeters, dy, zMeters));

      const patternField = evaluatePatternFromDirection(
        params,
        xMeters / distM,
        dy / distM,
        zMeters / distM,
        cosAz,
        sinAz,
        cosTilt,
        sinTilt,
      );
      const patternLossDb = -20 * Math.log10(Math.max(patternField, 0.004));
      const fsplDb =
        fsplFreqConst + 20 * Math.log10(Math.max(distM / 1000, 0.0015));

      const obstacle = evaluateObstacleGeometry(
        scenario.id,
        scenario.obstacleDistanceM,
        scenario.obstacleHeightM,
        wavelengthM,
        scenario.towerHeightM,
        xMeters,
        zMeters,
        rxHeightM,
      );

      let twoRayDeltaDb = 0;
      if (isTwoRay && !obstacle.insideBuilding && horizDistM > 0.25) {
        const r2M = Math.max(1.5, Math.hypot(xMeters, refDy, zMeters));
        const reflField = evaluatePatternFromDirection(
          params,
          xMeters / r2M,
          refDy / r2M,
          zMeters / r2M,
          cosAz,
          sinAz,
          cosTilt,
          sinTilt,
        );
        const shadowScale = obstacle.diffractionLossDb > 6 ? 0.25 : 1;
        const reflectedRatio =
          (Math.max(reflField, 0.004) / Math.max(patternField, 0.004)) *
          shadowScale;
        twoRayDeltaDb = computeTwoRayDeltaDbFromLengths(
          distM,
          r2M,
          scenario.towerHeightM,
          rxHeightM,
          horizDistM,
          wavelengthM,
          reflectedRatio,
        );
      }

      const rxDbm =
        eirpDbm -
        patternLossDb -
        fsplDb +
        twoRayDeltaDb -
        obstacle.diffractionLossDb -
        obstacle.penetrationLossDb;
      const [r, g, b] = groundFieldToRgb(rxDbm);

      buffer[ptr++] = Math.round(r * 255);
      buffer[ptr++] = Math.round(g * 255);
      buffer[ptr++] = Math.round(b * 255);
      buffer[ptr++] = 255;
    }
  }
}
