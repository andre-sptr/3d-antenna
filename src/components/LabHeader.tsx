import { ANTENNA_CATALOG, type AntennaParams } from '../lib/antennaPhysics';

interface LabHeaderProps {
  params: AntennaParams;
  autoOrbit: boolean;
  onToggleAutoOrbit: () => void;
}

export function LabHeader({
  params,
  autoOrbit,
  onToggleAutoOrbit,
}: LabHeaderProps) {
  const meta = ANTENNA_CATALOG[params.type];
  const freqDisplay =
    params.frequencyMHz >= 1000
      ? `${(params.frequencyMHz / 1000).toFixed(2)} GHz`
      : `${params.frequencyMHz.toFixed(1)} MHz`;

  return (
    <header className="lab-header">
      <div className="lab-header-left">
        <a href="#lab-workspace" className="wordmark">
          AntennaLab 3D
        </a>
        <span className="header-readout mono-num">
          {meta.shortName} · {freqDisplay} · {params.gainDbi.toFixed(1)} dBi
        </span>
      </div>

      <nav className="lab-header-nav" aria-label="Related RF tools">
        <a
          href="https://rf.andresptr.site/"
          target="_blank"
          rel="noopener noreferrer"
          className="header-ext-link"
        >
          LinkSight RF
        </a>
        <a
          href="https://radio.andresptr.site/"
          target="_blank"
          rel="noopener noreferrer"
          className="header-ext-link"
        >
          Over the Air
        </a>
        <button
          type="button"
          className="btn-secondary header-orbit-btn"
          onClick={onToggleAutoOrbit}
        >
          {autoOrbit ? 'Stop Orbit' : 'Auto-Orbit'}
        </button>
      </nav>
    </header>
  );
}
