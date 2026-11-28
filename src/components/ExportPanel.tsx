import { useEffect, useRef, useState } from 'react';
import type { Theme } from '../hooks/useTheme';
import {
  ANTENNA_CATALOG,
  type AntennaParams,
  type ScaleMode,
  type ScenarioConfig,
} from '../lib/antennaPhysics';
import {
  buildExportFilename,
  downloadTextFile,
  generateMsiPlanetContent,
  generatePatternCsv,
  generatePolarSvgString,
} from '../lib/exporters';
import { buildLinkSightUrl } from '../lib/urlState';

interface ExportPanelProps {
  params: AntennaParams;
  scenario: ScenarioConfig;
  scaleMode: ScaleMode;
  theme: Theme;
  canCaptureSnapshot: boolean;
  onCopyShareUrl: () => Promise<boolean> | boolean;
  onCapturePng: () => void;
  onResetDefaults: () => void;
}

export function ExportPanel({
  params,
  scenario,
  scaleMode,
  theme,
  canCaptureSnapshot,
  onCopyShareUrl,
  onCapturePng,
  onResetDefaults,
}: ExportPanelProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleCopyClick = async () => {
    const ok = await onCopyShareUrl();
    setCopyStatus(ok ? 'copied' : 'error');
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setCopyStatus('idle');
      timerRef.current = null;
    }, 2400);
  };

  const handleDownloadMsi = () => {
    const content = generateMsiPlanetContent(params);
    downloadTextFile(
      buildExportFilename(params, 'msi'),
      content,
      'text/plain;charset=utf-8',
    );
  };

  const handleDownloadCsv = () => {
    const content = generatePatternCsv(params);
    downloadTextFile(
      buildExportFilename(params, 'csv'),
      content,
      'text/csv;charset=utf-8',
    );
  };

  const handleDownloadSvg = () => {
    const content = generatePolarSvgString(params, scaleMode, theme);
    downloadTextFile(
      buildExportFilename(params, 'svg'),
      content,
      'image/svg+xml;charset=utf-8',
    );
  };

  const activeMeta = ANTENNA_CATALOG[params.type];
  const linkSightUrl = buildLinkSightUrl(params, scenario);

  return (
    <div className="tab-panel-inner">
      <section className="control-group" aria-labelledby="share-heading">
        <h2 id="share-heading" className="group-heading">
          Share Lab Configuration
        </h2>
        <p className="topology-note">
          URL query parameters synchronize live ({activeMeta.shortName},{' '}
          {params.frequencyMHz >= 1000
            ? `${(params.frequencyMHz / 1000).toFixed(2)} GHz`
            : `${params.frequencyMHz.toFixed(1)} MHz`}
          , {params.gainDbi.toFixed(1)} dBi).
        </p>
        <button
          type="button"
          className="btn-primary"
          onClick={handleCopyClick}
        >
          {copyStatus === 'copied'
            ? 'Copied Shareable Link!'
            : 'Copy Shareable Lab Link'}
        </button>
        <div className="copy-feedback" role="status" aria-live="polite">
          {copyStatus === 'copied' && 'Configuration URL copied to clipboard.'}
          {copyStatus === 'error' &&
            'Clipboard permission unavailable — copy the address bar URL.'}
        </div>
      </section>

      <section className="control-group" aria-labelledby="exports-heading">
        <h2 id="exports-heading" className="group-heading">
          Engineering Data Exports
        </h2>
        <div className="export-btn-grid">
          <button
            type="button"
            className="export-action-btn"
            onClick={handleDownloadMsi}
          >
            <strong>MSI / Planet (.msi)</strong>
            <span className="mono-num">360° H/V attenuation table</span>
          </button>

          <button
            type="button"
            className="export-action-btn"
            onClick={handleDownloadCsv}
          >
            <strong>3D Pattern Grid (.csv)</strong>
            <span className="mono-num">5° spherical theta / phi / dBi</span>
          </button>

          <button
            type="button"
            className="export-action-btn"
            onClick={handleDownloadSvg}
          >
            <strong>2D Polar Cuts (.svg)</strong>
            <span className="mono-num">Vector H &amp; E plane datasheet</span>
          </button>

          <button
            type="button"
            className="export-action-btn"
            disabled={!canCaptureSnapshot}
            onClick={onCapturePng}
          >
            <strong>3D Viewport (.png)</strong>
            <span className="mono-num">High-DPI WebGL snapshot</span>
          </button>
        </div>
      </section>

      <section className="control-group" aria-labelledby="handoff-heading">
        <h2 id="handoff-heading" className="group-heading">
          RF Planning Handoff
        </h2>
        <p className="topology-note">
          Carry frequency, gain, TX power, azimuth, downtilt, and tower height into LinkSight RF terrain planning.
        </p>
        <a
          href={linkSightUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary reset-btn handoff-link"
        >
          Open in LinkSight RF
        </a>
      </section>

      <div className="reset-row">
        <button
          type="button"
          className="btn-secondary reset-btn"
          onClick={onResetDefaults}
        >
          Reset Lab Defaults
        </button>
      </div>
    </div>
  );
}
