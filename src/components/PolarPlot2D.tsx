import { useMemo } from 'react';
import {
  computeAntennaMetrics,
  degToRad,
  linearToRadius,
  samplePolarCut,
  type AntennaParams,
  type ScaleMode,
} from '../lib/antennaPhysics';

interface PolarPlot2DProps {
  params: AntennaParams;
  scaleMode: ScaleMode;
}

const CENTER = 80;
const MAX_R = 60;

function buildPolarPath(
  samples: ReturnType<typeof samplePolarCut>,
  scaleMode: ScaleMode,
  isVertical: boolean,
): string {
  return samples
    .map((sample, idx) => {
      const r = linearToRadius(sample.linear, scaleMode) * MAX_R;
      const rad = degToRad(sample.angleDeg);
      // H-plane: angle 0 = East (+X right), 90 = South (+Y down on screen)
      // E-plane: angle 0 = Forward (+X right), 90 = Zenith (-Y up on screen)
      const x = CENTER + Math.cos(rad) * r;
      const y = isVertical
        ? CENTER - Math.sin(rad) * r
        : CENTER + Math.sin(rad) * r;
      return `${idx === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ')
    .concat(' Z');
}

function PolarChartCard({
  title,
  planeLabel,
  pathData,
  strokeColor,
  hpbwDeg,
  scaleMode,
}: {
  title: string;
  planeLabel: string;
  pathData: string;
  strokeColor: string;
  hpbwDeg: number;
  scaleMode: ScaleMode;
}) {
  const r3db = linearToRadius(Math.SQRT1_2, scaleMode) * MAX_R;
  const r10db = linearToRadius(Math.pow(10, -10 / 20), scaleMode) * MAX_R;
  const r20db = linearToRadius(Math.pow(10, -20 / 20), scaleMode) * MAX_R;

  return (
    <figure className="polar-card">
      <div className="polar-card-head">
        <span className="polar-card-title">{title}</span>
        <span className="polar-hpbw mono-num">HPBW {hpbwDeg} deg</span>
      </div>
      <svg
        role="img"
        viewBox="0 0 160 160"
        className="polar-svg"
        width="160"
        height="160"
      >
        <title>
          {title} ({planeLabel}) polar radiation cut in {scaleMode === 'log' ? 'logarithmic dBi' : 'linear power'} scale, half-power beamwidth {hpbwDeg} degrees
        </title>

        {/* Reference dB circles */}
        <circle cx={CENTER} cy={CENTER} r={MAX_R} className="polar-ring" />
        <circle cx={CENTER} cy={CENTER} r={r10db} className="polar-ring" />
        <circle cx={CENTER} cy={CENTER} r={r20db} className="polar-ring" />
        <circle cx={CENTER} cy={CENTER} r={r3db} className="polar-ring-3db" />

        {/* Crosshair axes */}
        <line
          x1={CENTER - MAX_R}
          y1={CENTER}
          x2={CENTER + MAX_R}
          y2={CENTER}
          className="polar-axis"
        />
        <line
          x1={CENTER}
          y1={CENTER - MAX_R}
          x2={CENTER}
          y2={CENTER + MAX_R}
          className="polar-axis"
        />

        {/* Active radiation pattern */}
        <path
          d={pathData}
          fill={strokeColor}
          fillOpacity={0.18}
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Cardinal angle ticks */}
        <text x={CENTER + MAX_R + 4} y={CENTER + 3} className="polar-label">
          0°
        </text>
        <text x={CENTER - 8} y={CENTER - MAX_R - 4} className="polar-label">
          {planeLabel === 'Azimuth' ? '270°' : '+90°'}
        </text>
        <text x={CENTER - MAX_R - 18} y={CENTER + 3} className="polar-label">
          180°
        </text>
        <text x={CENTER - 8} y={CENTER + MAX_R + 11} className="polar-label">
          {planeLabel === 'Azimuth' ? '90°' : '-90°'}
        </text>
      </svg>
    </figure>
  );
}

export function PolarPlot2D({ params, scaleMode }: PolarPlot2DProps) {
  const { hPath, ePath, metrics } = useMemo(() => {
    const hSamples = samplePolarCut(params, 'h', 144);
    const eSamples = samplePolarCut(params, 'e', 144);
    return {
      hPath: buildPolarPath(hSamples, scaleMode, false),
      ePath: buildPolarPath(eSamples, scaleMode, true),
      metrics: computeAntennaMetrics(params),
    };
  }, [params, scaleMode]);

  return (
    <div className="polar-grid">
      <PolarChartCard
        title="H-Plane Cut"
        planeLabel="Azimuth"
        pathData={hPath}
        strokeColor="#3DD6A4"
        hpbwDeg={metrics.azimuthHpbwDeg}
        scaleMode={scaleMode}
      />
      <PolarChartCard
        title="E-Plane Cut"
        planeLabel="Elevation"
        pathData={ePath}
        strokeColor="#F4A940"
        hpbwDeg={metrics.elevationHpbwDeg}
        scaleMode={scaleMode}
      />
    </div>
  );
}
