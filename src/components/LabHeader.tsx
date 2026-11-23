import { ANTENNA_CATALOG, type AntennaParams } from '../lib/antennaPhysics';
import type { Theme } from '../hooks/useTheme';

interface LabHeaderProps {
  params: AntennaParams;
  autoOrbit: boolean;
  theme: Theme;
  onToggleAutoOrbit: () => void;
  onToggleTheme: () => void;
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function LabHeader({
  params,
  autoOrbit,
  theme,
  onToggleAutoOrbit,
  onToggleTheme,
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
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
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
