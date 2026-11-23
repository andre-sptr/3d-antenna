import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ANTENNA_PARAMS,
  DEFAULT_SCENARIO,
  computeAntennaMetrics,
  dbiToRgb,
  evaluateGroundFieldDbm,
  evaluatePatternLinear,
  type AntennaParams,
} from './antennaPhysics';

describe('antennaPhysics far-field and propagation calculations', () => {
  it('models Half-Wave Dipole with zenith/nadir nulls, horizon peak, and ~78 deg elevation HPBW', () => {
    const dipole: AntennaParams = {
      ...DEFAULT_ANTENNA_PARAMS,
      type: 'dipole',
      gainDbi: 2.15,
      azimuthDeg: 0,
      downtiltDeg: 0,
    };

    const zenith = evaluatePatternLinear(dipole, 0, 0);
    const horizon = evaluatePatternLinear(dipole, Math.PI / 2, 0);
    const metrics = computeAntennaMetrics(dipole);

    expect(zenith).toBeCloseTo(0, 4);
    expect(horizon).toBeCloseTo(1, 4);
    expect(metrics.azimuthHpbwDeg).toBe(360);
    expect(metrics.elevationHpbwDeg).toBeGreaterThanOrEqual(74);
    expect(metrics.elevationHpbwDeg).toBeLessThanOrEqual(82);
  });

  it('narrows Collinear Omni vertical HPBW as gain rises from 3 dBi to 12 dBi', () => {
    const lowGain = computeAntennaMetrics({
      ...DEFAULT_ANTENNA_PARAMS,
      type: 'omni',
      gainDbi: 3,
      downtiltDeg: 0,
    });
    const highGain = computeAntennaMetrics({
      ...DEFAULT_ANTENNA_PARAMS,
      type: 'omni',
      gainDbi: 12,
      downtiltDeg: 0,
    });

    expect(lowGain.azimuthHpbwDeg).toBe(360);
    expect(highGain.azimuthHpbwDeg).toBe(360);
    expect(highGain.elevationHpbwDeg).toBeLessThan(lowGain.elevationHpbwDeg);
  });

  it('produces narrow Airy pencil beam and high F/B ratio for 24 dBi Parabolic Dish', () => {
    const dish: AntennaParams = {
      ...DEFAULT_ANTENNA_PARAMS,
      type: 'dish',
      gainDbi: 24,
      azimuthDeg: 0,
      downtiltDeg: 0,
    };
    const metrics = computeAntennaMetrics(dish);
    const boresight = evaluatePatternLinear(dish, Math.PI / 2, 0);
    const back = evaluatePatternLinear(dish, Math.PI / 2, Math.PI);

    expect(boresight).toBeCloseTo(1, 3);
    expect(back).toBeLessThan(0.05);
    expect(metrics.azimuthHpbwDeg).toBeLessThan(16);
    expect(metrics.frontToBackDb).toBeGreaterThan(22);
  });

  it('steers Sectoral BTS peak elevation downward when downtilt is applied', () => {
    const sector: AntennaParams = {
      ...DEFAULT_ANTENNA_PARAMS,
      type: 'sector',
      gainDbi: 16,
      azimuthDeg: 0,
      downtiltDeg: 10,
      sectorBeamwidthDeg: 90,
    };

    const atHorizon = evaluatePatternLinear(sector, Math.PI / 2, 0);
    const atTenDegDown = evaluatePatternLinear(
      sector,
      Math.PI / 2 + (10 * Math.PI) / 180,
      0,
    );

    expect(atTenDegDown).toBeCloseTo(1, 3);
    expect(atTenDegDown).toBeGreaterThan(atHorizon);
  });

  it('applies urban building shadow loss compared to open-field ground propagation', () => {
    const openDbm = evaluateGroundFieldDbm(
      DEFAULT_ANTENNA_PARAMS,
      { ...DEFAULT_SCENARIO, id: 'open-field', towerHeightM: 12 },
      30,
      0,
    );
    const urbanDbm = evaluateGroundFieldDbm(
      DEFAULT_ANTENNA_PARAMS,
      {
        id: 'urban',
        towerHeightM: 12,
        obstacleDistanceM: 18,
        obstacleHeightM: 16,
      },
      30,
      0,
    );

    expect(openDbm - urbanDbm).toBeGreaterThan(10);
  });

  it('returns bounded [0..1] RGB components across colormap range', () => {
    const low = dbiToRgb(-30);
    const mid = dbiToRgb(-8);
    const peak = dbiToRgb(0);

    for (const color of [low, mid, peak]) {
      for (const ch of color) {
        expect(ch).toBeGreaterThanOrEqual(0);
        expect(ch).toBeLessThanOrEqual(1);
      }
    }
    expect(peak[0]).toBeGreaterThan(low[0]);
  });
});
