import type { ScenarioId } from '../lib/antennaPhysics';
import type { CameraPresetId } from '../scene/CameraRig';

interface ViewportOverlayProps {
  gainDbi: number;
  scenarioId: ScenarioId;
  onSelectCameraPreset: (preset: CameraPresetId) => void;
}

const CAMERA_PRESETS: readonly { id: CameraPresetId; label: string }[] = [
  { id: 'iso', label: 'Iso 3D' },
  { id: 'top', label: 'Top' },
  { id: 'side', label: 'Side' },
  { id: 'boresight', label: 'Boresight' },
  { id: 'reset', label: 'Reset' },
];

export function ViewportOverlay({
  gainDbi,
  scenarioId,
  onSelectCameraPreset,
}: ViewportOverlayProps) {
  const isAnechoic = scenarioId === 'anechoic';

  return (
    <div className="viewport-hud">
      <div className="colorbar-card" aria-label="Radiation gain color scale">
        <div className="colorbar-header">
          <span>{isAnechoic ? 'Relative Pattern' : 'Pattern + Ground'}</span>
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
  );
}
