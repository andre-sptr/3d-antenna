import {
  ANTENNA_CATALOG,
  computeAntennaMetrics,
  degToRad,
  evaluatePatternLinear,
  linearToRadius,
  linearToRelativeDb,
  samplePolarCut,
  type AntennaParams,
  type ScaleMode,
} from './antennaPhysics';
import { clampNumber } from './propagationMath';

export function buildExportFilename(
  params: AntennaParams,
  extension: string,
): string {
  const freqLabel = Math.round(params.frequencyMHz);
  const gainLabel = params.gainDbi.toFixed(1).replace('.', '_');
  const ext = extension.replace(/^\./, '');
  return `antennalab-${params.type}-${freqLabel}mhz-${gainLabel}dbi.${ext}`;
}

/**
 * Generates standard MSI / Planet (.msi) antenna pattern file with 360 H & 360 V samples.
 * Evaluates in local boresight orientation (azimuthDeg = 0) and records electrical downtilt.
 */
export function generateMsiPlanetContent(params: AntennaParams): string {
  const meta = ANTENNA_CATALOG[params.type];
  const localParams: AntennaParams = {
    ...params,
    azimuthDeg: 0,
  };

  const boresightTheta = clampNumber(
    Math.PI / 2 + degToRad(params.downtiltDeg),
    0.01,
    Math.PI - 0.01,
  );

  const hRaw: number[] = [];
  let hPeak = 1e-6;
  for (let deg = 0; deg < 360; deg++) {
    const val = evaluatePatternLinear(
      localParams,
      boresightTheta,
      degToRad(deg),
    );
    hRaw.push(val);
    if (val > hPeak) hPeak = val;
  }

  const vRaw: number[] = [];
  let vPeak = 1e-6;
  for (let deg = 0; deg < 360; deg++) {
    // Planet vertical convention: 0 deg = forward horizon (+X), 90 deg = nadir (-Y)
    const rad = degToRad(deg);
    const ux = Math.cos(rad);
    const uy = -Math.sin(rad);
    const theta = Math.acos(clampNumber(uy, -1, 1));
    const phi = ux >= 0 ? 0 : Math.PI;
    const val = evaluatePatternLinear(localParams, theta, phi);
    vRaw.push(val);
    if (val > vPeak) vPeak = val;
  }

  const lines: string[] = [
    `NAME AntennaLab3D_${params.type}_${Math.round(params.frequencyMHz)}MHz`,
    'MAKE AntennaLab3D',
    `FREQUENCY ${params.frequencyMHz.toFixed(2)}`,
    `GAIN ${params.gainDbi.toFixed(2)} dBi`,
    `TILT ELECTRICAL ${params.downtiltDeg.toFixed(1)}`,
    `COMMENT ${meta.name}${params.type === 'sector' ? ` (${params.sectorBeamwidthDeg} deg sector)` : ''}`,
    'HORIZONTAL 360',
  ];

  for (let deg = 0; deg < 360; deg++) {
    const norm = hRaw[deg] / hPeak;
    const attDb = clampNumber(-20 * Math.log10(Math.max(norm, 0.01)), 0, 40);
    lines.push(`${deg} ${attDb.toFixed(2)}`);
  }

  lines.push('VERTICAL 360');
  for (let deg = 0; deg < 360; deg++) {
    const norm = vRaw[deg] / vPeak;
    const attDb = clampNumber(-20 * Math.log10(Math.max(norm, 0.01)), 0, 40);
    lines.push(`${deg} ${attDb.toFixed(2)}`);
  }

  return `${lines.join('\n')}\n`;
}

/**
 * Generates a spherical 3D far-field CSV dataset (`theta_deg,phi_deg,elevation_deg,relative_db,gain_dbi,linear_field`).
 */
export function generatePatternCsv(
  params: AntennaParams,
  stepDeg = 5,
): string {
  const safeStep = Math.max(1, Math.round(stepDeg));
  const rows: string[] = [
    'theta_deg,phi_deg,elevation_deg,relative_db,gain_dbi,linear_field',
  ];

  for (let thetaDeg = 0; thetaDeg <= 180; thetaDeg += safeStep) {
    const thetaRad = degToRad(thetaDeg);
    const elevationDeg = 90 - thetaDeg;
    for (let phiDeg = 0; phiDeg < 360; phiDeg += safeStep) {
      const linear = evaluatePatternLinear(params, thetaRad, degToRad(phiDeg));
      const relDb = linearToRelativeDb(linear, -40);
      const absGainDbi = params.gainDbi + relDb;
      rows.push(
        `${thetaDeg},${phiDeg},${elevationDeg},${relDb.toFixed(3)},${absGainDbi.toFixed(3)},${linear.toFixed(5)}`,
      );
    }
  }

  return `${rows.join('\n')}\n`;
}

function buildPolarSvgPath(
  samples: ReturnType<typeof samplePolarCut>,
  scaleMode: ScaleMode,
  cx: number,
  cy: number,
  maxR: number,
  isVertical: boolean,
): string {
  return samples
    .map((sample, idx) => {
      const r = linearToRadius(sample.linear, scaleMode) * maxR;
      const rad = degToRad(sample.angleDeg);
      const x = cx + Math.cos(rad) * r;
      const y = isVertical ? cy - Math.sin(rad) * r : cy + Math.sin(rad) * r;
      return `${idx === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ')
    .concat(' Z');
}

function renderPolarSubplot(opts: {
  title: string;
  subtitle: string;
  cx: number;
  cy: number;
  maxR: number;
  pathData: string;
  stroke: string;
  isVertical: boolean;
  scaleMode: ScaleMode;
  ringColor: string;
  ring3dbColor: string;
  textColor: string;
  subTextColor: string;
  cardBg: string;
  cardBorder: string;
}): string {
  const {
    title,
    subtitle,
    cx,
    cy,
    maxR,
    pathData,
    stroke,
    isVertical,
    scaleMode,
    ringColor,
    ring3dbColor,
    textColor,
    subTextColor,
    cardBg,
    cardBorder,
  } = opts;
  const r3db = linearToRadius(Math.SQRT1_2, scaleMode) * maxR;
  const r10db = linearToRadius(Math.pow(10, -10 / 20), scaleMode) * maxR;
  const r20db = linearToRadius(Math.pow(10, -20 / 20), scaleMode) * maxR;
  const topLabel = isVertical ? '+90°' : '270°';
  const bottomLabel = isVertical ? '-90°' : '90°';

  const cardX = cx - 165;
  const cardY = 84;

  return `
  <g>
    <rect x="${cardX}" y="${cardY}" width="330" height="292" rx="6" fill="${cardBg}" stroke="${cardBorder}" />
    <text x="${cardX + 16}" y="${cardY + 26}" font-size="13" font-weight="600" fill="${textColor}">${title}</text>
    <text x="${cardX + 314}" y="${cardY + 26}" text-anchor="end" font-family="monospace" font-size="11" fill="${subTextColor}">${subtitle}</text>
    <circle cx="${cx}" cy="${cy}" r="${maxR}" fill="none" stroke="${ringColor}" stroke-width="1" />
    <circle cx="${cx}" cy="${cy}" r="${r10db.toFixed(2)}" fill="none" stroke="${ringColor}" stroke-width="1" />
    <circle cx="${cx}" cy="${cy}" r="${r20db.toFixed(2)}" fill="none" stroke="${ringColor}" stroke-width="1" />
    <circle cx="${cx}" cy="${cy}" r="${r3db.toFixed(2)}" fill="none" stroke="${ring3dbColor}" stroke-width="1" stroke-dasharray="3 3" />
    <line x1="${cx - maxR}" y1="${cy}" x2="${cx + maxR}" y2="${cy}" stroke="${ringColor}" stroke-width="1" />
    <line x1="${cx}" y1="${cy - maxR}" x2="${cx}" y2="${cy + maxR}" stroke="${ringColor}" stroke-width="1" />
    <path d="${pathData}" fill="${stroke}" fill-opacity="0.18" stroke="${stroke}" stroke-width="2.2" stroke-linejoin="round" />
    <text x="${cx + maxR + 6}" y="${cy + 3}" font-family="monospace" font-size="10" fill="${subTextColor}">0°</text>
    <text x="${cx}" y="${cy - maxR - 6}" text-anchor="middle" font-family="monospace" font-size="10" fill="${subTextColor}">${topLabel}</text>
    <text x="${cx - maxR - 6}" y="${cy + 3}" text-anchor="end" font-family="monospace" font-size="10" fill="${subTextColor}">180°</text>
    <text x="${cx}" y="${cy + maxR + 14}" text-anchor="middle" font-family="monospace" font-size="10" fill="${subTextColor}">${bottomLabel}</text>
  </g>`;
}

/**
 * Generates a standalone publication-grade dual-plane SVG datasheet chart.
 */
export function generatePolarSvgString(
  params: AntennaParams,
  scaleMode: ScaleMode,
  theme: 'dark' | 'light',
): string {
  const meta = ANTENNA_CATALOG[params.type];
  const metrics = computeAntennaMetrics(params);
  const hSamples = samplePolarCut(params, 'h', 180);
  const eSamples = samplePolarCut(params, 'e', 180);

  const isDark = theme === 'dark';
  const bg = isDark ? '#090D12' : '#F4F6F8';
  const cardBg = isDark ? '#111720' : '#FFFFFF';
  const cardBorder = isDark ? '#243142' : '#D0D7E0';
  const textColor = isDark ? '#EDF2F7' : '#131920';
  const subTextColor = isDark ? '#A9B7C6' : '#56626E';
  const ringColor = isDark ? '#2E3F53' : '#C4CCDA';
  const ring3dbColor = isDark ? '#6F86A0' : '#8893A4';
  const hColor = isDark ? '#3DD6A4' : '#1A9E72';
  const eColor = isDark ? '#F4A940' : '#C47E14';

  const maxR = 96;
  const cy = 240;
  const hCx = 195;
  const eCx = 565;

  const hPath = buildPolarSvgPath(hSamples, scaleMode, hCx, cy, maxR, false);
  const ePath = buildPolarSvgPath(eSamples, scaleMode, eCx, cy, maxR, true);
  const freqStr =
    params.frequencyMHz >= 1000
      ? `${(params.frequencyMHz / 1000).toFixed(2)} GHz`
      : `${params.frequencyMHz.toFixed(1)} MHz`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="400" viewBox="0 0 760 400" font-family="system-ui, -apple-system, sans-serif">
  <rect width="760" height="400" fill="${bg}" />
  <text x="30" y="34" font-size="18" font-weight="600" fill="${textColor}">AntennaLab 3D — ${meta.name}</text>
  <text x="30" y="56" font-family="monospace" font-size="12" fill="${subTextColor}">Freq ${freqStr} · Gain ${params.gainDbi.toFixed(1)} dBi · EIRP ${metrics.peakEirpDbm} dBm · F/B ${metrics.frontToBackDb} dB · Scale ${scaleMode === 'log' ? 'Log dBi (-25..0 dB)' : 'Linear Power'}</text>
  <text x="730" y="34" text-anchor="end" font-family="monospace" font-size="11" fill="${subTextColor}">Az ${params.azimuthDeg}° · Tilt ${params.downtiltDeg >= 0 ? `+${params.downtiltDeg}` : params.downtiltDeg}°</text>
  ${renderPolarSubplot({
    title: 'H-Plane Cut (Azimuth)',
    subtitle: `HPBW ${metrics.azimuthHpbwDeg}°`,
    cx: hCx,
    cy,
    maxR,
    pathData: hPath,
    stroke: hColor,
    isVertical: false,
    scaleMode,
    ringColor,
    ring3dbColor,
    textColor,
    subTextColor,
    cardBg,
    cardBorder,
  })}
  ${renderPolarSubplot({
    title: 'E-Plane Cut (Elevation)',
    subtitle: `HPBW ${metrics.elevationHpbwDeg}°`,
    cx: eCx,
    cy,
    maxR,
    pathData: ePath,
    stroke: eColor,
    isVertical: true,
    scaleMode,
    ringColor,
    ring3dbColor,
    textColor,
    subTextColor,
    cardBg,
    cardBorder,
  })}
</svg>
`;
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadDataUrl(filename: string, dataUrl: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
