import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ANTENNA_PARAMS,
  DEFAULT_RX_PROBE,
  DEFAULT_SCENARIO,
  calculateWavelengthMeters,
  evaluateGroundFieldDbm,
} from './antennaPhysics';
import {
  fresnelRadiusMeters,
  knifeEdgeDiffractionLossDb,
  texelToGroundMeters,
} from './propagationMath';
import { evaluateLinkBudget } from './propagationPhysics';

describe('propagationPhysics ITU-R P.526, 2-Ray, Fresnel, and Link Budget', () => {
  it('computes ITU-R P.526 single knife-edge diffraction loss accurately', () => {
    expect(knifeEdgeDiffractionLossDb(-1.5)).toBe(0);
    expect(knifeEdgeDiffractionLossDb(-0.78)).toBe(0);

    const grazing = knifeEdgeDiffractionLossDb(0);
    expect(grazing).toBeCloseTo(6.9 + 20 * Math.log10(Math.sqrt(1.01) - 0.1), 4);

    const mildBlock = knifeEdgeDiffractionLossDb(1.0);
    const deepBlock = knifeEdgeDiffractionLossDb(3.0);
    expect(mildBlock).toBeGreaterThan(grazing);
    expect(deepBlock).toBeGreaterThan(mildBlock);
  });

  it('computes 1st Fresnel ellipsoid radius analytically', () => {
    const r = fresnelRadiusMeters(15, 15, 0.123);
    expect(r).toBeCloseTo(Math.sqrt((0.123 * 15 * 15) / 30), 6);
    expect(fresnelRadiusMeters(0, 15, 0.123)).toBe(0);
    expect(fresnelRadiusMeters(15, 0, 0.123)).toBe(0);
  });

  it('exhibits frequency-dependent knife-edge diffraction across VHF and C-band', () => {
    const urbanScenario = {
      id: 'urban' as const,
      towerHeightM: 12,
      obstacleDistanceM: 18,
      obstacleHeightM: 16,
    };
    const vhf = evaluateLinkBudget(
      { ...DEFAULT_ANTENNA_PARAMS, frequencyMHz: 146.52 },
      urbanScenario,
      { ...DEFAULT_RX_PROBE, xMeters: 30, zMeters: 0, rxHeightM: 1.5 },
      'fspl',
    );
    const cBand = evaluateLinkBudget(
      { ...DEFAULT_ANTENNA_PARAMS, frequencyMHz: 5800 },
      urbanScenario,
      { ...DEFAULT_RX_PROBE, xMeters: 30, zMeters: 0, rxHeightM: 1.5 },
      'fspl',
    );

    expect(cBand.diffractionLossDb).toBeGreaterThan(vhf.diffractionLossDb);
    expect(calculateWavelengthMeters(5800)).toBeLessThan(
      calculateWavelengthMeters(146.52),
    );
  });

  it('computes bounded 2-Ray ground reflection interference fringes relative to FSPL', () => {
    const openScenario = { ...DEFAULT_SCENARIO, id: 'open-field' as const };
    const deltas: number[] = [];

    for (let x = 4; x <= 36; x += 2) {
      const fspl = evaluateGroundFieldDbm(
        DEFAULT_ANTENNA_PARAMS,
        openScenario,
        x,
        0,
        'fspl',
      );
      const twoRay = evaluateGroundFieldDbm(
        DEFAULT_ANTENNA_PARAMS,
        openScenario,
        x,
        0,
        'two-ray',
      );
      const delta = twoRay - fspl;
      expect(delta).toBeGreaterThanOrEqual(-18.01);
      expect(delta).toBeLessThanOrEqual(6.01);
      deltas.push(delta);
    }

    const spread = Math.max(...deltas) - Math.min(...deltas);
    expect(spread).toBeGreaterThan(2);
  });

  it('classifies clear, grazing, blocked, and indoor link states with exact budget sum', () => {
    const openClear = evaluateLinkBudget(
      DEFAULT_ANTENNA_PARAMS,
      { ...DEFAULT_SCENARIO, id: 'open-field' },
      { ...DEFAULT_RX_PROBE, xMeters: 26, zMeters: 0, rxHeightM: 1.5 },
      'fspl',
    );
    expect(openClear.fresnelStatus).toBe('clear');

    const ridgeGrazing = evaluateLinkBudget(
      DEFAULT_ANTENNA_PARAMS,
      {
        id: 'ridge',
        towerHeightM: 18,
        obstacleDistanceM: 18,
        obstacleHeightM: 14,
      },
      { ...DEFAULT_RX_PROBE, xMeters: 36, zMeters: 0, rxHeightM: 10.6 },
      'fspl',
    );
    expect(ridgeGrazing.fresnelStatus).toBe('grazing');
    expect(ridgeGrazing.fresnelClearancePct).toBeGreaterThan(0);
    expect(ridgeGrazing.fresnelClearancePct).toBeLessThan(60);

    const urbanBlocked = evaluateLinkBudget(
      DEFAULT_ANTENNA_PARAMS,
      {
        id: 'urban',
        towerHeightM: 12,
        obstacleDistanceM: 18,
        obstacleHeightM: 18,
      },
      { ...DEFAULT_RX_PROBE, xMeters: 30, zMeters: 0, rxHeightM: 1.5 },
      'two-ray',
    );
    expect(urbanBlocked.fresnelStatus).toBe('blocked');
    expect(urbanBlocked.diffractionLossDb).toBeGreaterThan(10);

    const expectedRx =
      urbanBlocked.eirpDbm -
      urbanBlocked.txPatternLossDb -
      urbanBlocked.fsplDb +
      urbanBlocked.twoRayDeltaDb -
      urbanBlocked.diffractionLossDb -
      urbanBlocked.penetrationLossDb +
      urbanBlocked.rxGainDbi;
    expect(urbanBlocked.rxPowerDbm).toBeCloseTo(expectedRx, 6);

    const indoor = evaluateLinkBudget(
      DEFAULT_ANTENNA_PARAMS,
      {
        id: 'urban',
        towerHeightM: 18,
        obstacleDistanceM: 18,
        obstacleHeightM: 14,
      },
      { ...DEFAULT_RX_PROBE, xMeters: 18, zMeters: 0, rxHeightM: 2 },
      'fspl',
    );
    expect(indoor.insideBuilding).toBe(true);
    expect(indoor.penetrationLossDb).toBe(18);
    expect(indoor.fresnelStatus).toBe('blocked');
  });

  it('maps DataTexture texel indices symmetrically to ground world meters', () => {
    const N = 192;
    const westSouth = texelToGroundMeters(0, 0, N, 24, 0.32);
    const eastNorth = texelToGroundMeters(N - 1, N - 1, N, 24, 0.32);
    const c1 = texelToGroundMeters(N / 2 - 1, N / 2 - 1, N, 24, 0.32);
    const c2 = texelToGroundMeters(N / 2, N / 2, N, 24, 0.32);

    expect(westSouth.xMeters).toBeLessThan(-36);
    expect(eastNorth.xMeters).toBeGreaterThan(36);
    expect(westSouth.zMeters).toBeGreaterThan(36);
    expect(eastNorth.zMeters).toBeLessThan(-36);
    expect((c1.xMeters + c2.xMeters) / 2).toBeCloseTo(0, 6);
    expect((c1.zMeters + c2.zMeters) / 2).toBeCloseTo(0, 6);
  });
});
