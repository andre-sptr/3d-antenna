import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ANTENNA_PARAMS,
  DEFAULT_RX_PROBE,
  DEFAULT_SCENARIO,
} from './antennaPhysics';
import {
  buildExportFilename,
  generateMsiPlanetContent,
  generatePatternCsv,
  generatePolarSvgString,
} from './exporters';
import {
  buildLinkSightUrl,
  decodeLabStateFromQuery,
  encodeLabStateToQuery,
} from './urlState';

describe('exporters and URL state codec', () => {
  it('generates valid MSI/Planet pattern files with 360 H and 360 V rows', () => {
    const msi = generateMsiPlanetContent(DEFAULT_ANTENNA_PARAMS);
    const lines = msi.trim().split('\n');

    expect(msi).toContain('NAME AntennaLab3D_sector_2437MHz');
    expect(msi).toContain('MAKE AntennaLab3D');
    expect(msi).toContain('GAIN 16.00 dBi');
    expect(msi).toContain('TILT ELECTRICAL 6.0');

    const hIndex = lines.indexOf('HORIZONTAL 360');
    const vIndex = lines.indexOf('VERTICAL 360');
    expect(hIndex).toBeGreaterThan(-1);
    expect(vIndex).toBe(hIndex + 361);
    expect(lines.length).toBe(vIndex + 361);

    const hValues = lines.slice(hIndex + 1, vIndex).map((line) => {
      const [deg, att] = line.split(' ').map(Number);
      expect(att).toBeGreaterThanOrEqual(0);
      expect(att).toBeLessThanOrEqual(40);
      return { deg, att };
    });
    expect(hValues[0].deg).toBe(0);
    expect(hValues[359].deg).toBe(359);
    expect(Math.min(...hValues.map((x) => x.att))).toBeCloseTo(0, 2);

    const vValues = lines.slice(vIndex + 1).map((line) => {
      const [deg, att] = line.split(' ').map(Number);
      expect(att).toBeGreaterThanOrEqual(0);
      expect(att).toBeLessThanOrEqual(40);
      return { deg, att };
    });
    expect(vValues[0].deg).toBe(0);
    expect(vValues[359].deg).toBe(359);
    expect(Math.min(...vValues.map((x) => x.att))).toBeCloseTo(0, 2);
  });

  it('generates complete 5-degree spherical CSV pattern data', () => {
    const csv = generatePatternCsv(DEFAULT_ANTENNA_PARAMS, 5);
    const lines = csv.trim().split('\n');

    expect(lines[0]).toBe(
      'theta_deg,phi_deg,elevation_deg,relative_db,gain_dbi,linear_field',
    );
    expect(lines.length).toBe(1 + 37 * 72);

    const sampleRow = lines[1].split(',').map(Number);
    expect(sampleRow.length).toBe(6);
    for (const num of sampleRow) {
      expect(Number.isFinite(num)).toBe(true);
    }
  });

  it('generates standalone SVG polar charts for dark and light themes', () => {
    const darkSvg = generatePolarSvgString(DEFAULT_ANTENNA_PARAMS, 'log', 'dark');
    const lightSvg = generatePolarSvgString(DEFAULT_ANTENNA_PARAMS, 'linear', 'light');

    for (const svg of [darkSvg, lightSvg]) {
      expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('H-Plane Cut (Azimuth)');
      expect(svg).toContain('E-Plane Cut (Elevation)');
      expect(svg).toContain('16.0 dBi');
    }
    expect(darkSvg).toContain('#090D12');
    expect(lightSvg).toContain('#F4F6F8');
    expect(buildExportFilename(DEFAULT_ANTENNA_PARAMS, 'msi')).toBe(
      'antennalab-sector-2437mhz-16_0dbi.msi',
    );
  });

  it('round-trips URL query state and safely clamps malformed inputs', () => {
    const customState = {
      params: {
        ...DEFAULT_ANTENNA_PARAMS,
        type: 'dish' as const,
        frequencyMHz: 5800,
        gainDbi: 24,
        txPowerDbm: 33,
        azimuthDeg: 42,
        downtiltDeg: 3,
      },
      scenario: {
        id: 'urban' as const,
        towerHeightM: 22,
        obstacleDistanceM: 16,
        obstacleHeightM: 15,
      },
      propagationModel: 'two-ray' as const,
      scaleMode: 'linear' as const,
      rxProbe: {
        ...DEFAULT_RX_PROBE,
        enabled: true,
        xMeters: 28.5,
        zMeters: -4,
        rxHeightM: 3.5,
        rxGainDbi: 18,
        serviceProfile: 'ptp' as const,
      },
    };

    const query = encodeLabStateToQuery(customState);
    const decoded = decodeLabStateFromQuery(query);
    expect(decoded).toEqual(customState);

    const clamped = decodeLabStateFromQuery(
      '?type=invalid&f=999999&g=-50&rxx=999&rxz=-999&rxs=unknown&pm=bogus&sc=mars',
    );
    expect(clamped.params.type).toBe(DEFAULT_ANTENNA_PARAMS.type);
    expect(clamped.params.frequencyMHz).toBe(6000);
    expect(clamped.params.gainDbi).toBe(12);
    expect(clamped.scenario.id).toBe(DEFAULT_SCENARIO.id);
    expect(clamped.propagationModel).toBe('fspl');
    expect(clamped.rxProbe.xMeters).toBe(36);
    expect(clamped.rxProbe.zMeters).toBe(-36);
    expect(clamped.rxProbe.serviceProfile).toBe('5g');
  });

  it('builds a valid LinkSight RF handoff URL with standard RF parameters', () => {
    const url = buildLinkSightUrl(DEFAULT_ANTENNA_PARAMS, DEFAULT_SCENARIO);
    expect(url).toContain('https://rf.andresptr.site/?');
    expect(url).toContain('source=antennalab');
    expect(url).toContain('antennaType=sector');
    expect(url).toContain('freq=2437');
    expect(url).toContain('gain=16');
    expect(url).toContain('txPower=30');
    expect(url).toContain('downtilt=6');
    expect(url).toContain('towerHeight=18');
    expect(url).toContain('beamwidth=90');
  });
});
