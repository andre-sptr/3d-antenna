import type { PropagationModel, ScenarioId } from '../lib/antennaPhysics';
import type { LinkBudgetResult } from '../lib/propagationPhysics';
import type { CameraPresetId } from '../scene/CameraRig';

interface ViewportOverlayProps {
  gainDbi: number;
  scenarioId: ScenarioId;
  propagationModel: PropagationModel;
  rxProbeEnabled: boolean;
  linkBudget: LinkBudgetResult | null;
  onSelectCameraPreset: (preset: CameraPresetId) => void;
}

const CAMERA_PRESETS: readonly { id: CameraPresetId; label: string }[] = [
  { id: 'iso', label: 'Iso 3D' },
  { id: 'top', label: 'Top' },
  { id: 'side', label: 'Side' },
  { id: 'boresight', label: 'Boresight' },
  { id: 'reset', label: 'Reset' },
];

function getFresnelPillText(linkBudget: LinkBudgetResult): string {
  if (linkBudget.insideBuilding) {
    return 'Inside Bldg';
  }
  switch (linkBudget.fresnelStatus) {
    case 'clear':
      return 'F1 Clear';
    case 'grazing':
      return `F1 Grazing ${Math.round(linkBudget.fresnelClearancePct)}%`;
    case 'blocked':
      return 'NLOS Blocked';
  }
}

export function ViewportOverlay({
  gainDbi,
  scenarioId,
  propagationModel,
  rxProbeEnabled,
  linkBudget,
  onSelectCameraPreset,
}: ViewportOverlayProps) {
  const isAnechoic = scenarioId === 'anechoic';

  return (
    <>
      {!isAnechoic && rxProbeEnabled && linkBudget && (
        <div
          className="rx-hud-pill mono-num"
          role="status"
          aria-live="polite"
          data-status={linkBudget.fresnelStatus}
        >
          <span
            className="rx-status-dot"
            data-status={linkBudget.fresnelStatus}
            aria-hidden="true"
          />
          <span>RX {linkBudget.rxPowerDbm.toFixed(1)} dBm</span>
          <span className="rx-hud-sep" aria-hidden="true">
            ·
          </span>
          <span>
            Margin {linkBudget.fadeMarginDb >= 0 ? '+' : ''}
            {linkBudget.fadeMarginDb.toFixed(1)} dB
          </span>
          <span className="rx-hud-sep" aria-hidden="true">
            ·
          </span>
          <span className="rx-hud-fresnel" data-status={linkBudget.fresnelStatus}>
            {getFresnelPillText(linkBudget)}
          </span>
        </div>
      )}

      <div className="viewport-hud">
        <div className="colorbar-card" aria-label="Radiation and ground signal scales">
          <div className="colorbar-section">
            <div className="colorbar-header">
              <span>3D Pattern</span>
              <span className="mono-num">Peak {gainDbi.toFixed(1)} dBi</span>
            </div>
            <div className="colorbar-gradient" aria-hidden="true" />
            <div className="colorbar-ticks mono-num">
              <span>-25 dB</span>
              <span>-12 dB</span>
              <span>-3 dB</span>
              <span>0 dB</span>
            </div>
          </div>

          {!isAnechoic && (
            <div className="colorbar-section colorbar-divider">
              <div className="colorbar-header">
                <span>Ground Field</span>
                <span className="model-badge mono-num">
                  {propagationModel === 'two-ray' ? '2-Ray' : 'FSPL'}
                </span>
              </div>
              <div className="colorbar-gradient" aria-hidden="true" />
              <div className="colorbar-ticks mono-num">
                <span>-105 dBm</span>
                <span>-82</span>
                <span>-60</span>
                <span>-38 dBm</span>
              </div>
            </div>
          )}
        </div>

        <div
          className="camera-preset-bar"
          role="group"
          aria-label="Camera angle presets"
        >
          {CAMERA_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="camera-btn"
              onClick={() => onSelectCameraPreset(preset.id)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
