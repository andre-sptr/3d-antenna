import { useState } from 'react';
import { InspectorPanel } from './components/InspectorPanel';
import { LabHeader } from './components/LabHeader';
import { ViewportOverlay } from './components/ViewportOverlay';
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion';
import { useTheme } from './hooks/useTheme';
import {
  DEFAULT_ANTENNA_PARAMS,
  DEFAULT_SCENARIO,
  type AntennaParams,
  type ScaleMode,
  type ScenarioConfig,
} from './lib/antennaPhysics';
import { AntennaLabCanvas } from './scene/AntennaLabCanvas';
import type { CameraPresetId } from './scene/CameraRig';

export function App() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { theme, toggleTheme } = useTheme();
  const [params, setParams] = useState<AntennaParams>(DEFAULT_ANTENNA_PARAMS);
  const [scenario, setScenario] = useState<ScenarioConfig>(DEFAULT_SCENARIO);
  const [scaleMode, setScaleMode] = useState<ScaleMode>('log');
  const [showWireframe, setShowWireframe] = useState(false);
  const [showEPlane, setShowEPlane] = useState(true);
  const [showHPlane, setShowHPlane] = useState(true);
  const [showPolarCage, setShowPolarCage] = useState(true);
  const [autoOrbit, setAutoOrbit] = useState(false);
  const [presetRequest, setPresetRequest] = useState<{
    preset: CameraPresetId;
    seq: number;
  }>({ preset: 'iso', seq: 0 });

  const handleSelectCameraPreset = (preset: CameraPresetId) => {
    setPresetRequest((prev) => ({ preset, seq: prev.seq + 1 }));
  };

  const handleResetDefaults = () => {
    setParams(DEFAULT_ANTENNA_PARAMS);
    setScenario(DEFAULT_SCENARIO);
    setScaleMode('log');
    setShowWireframe(false);
    setShowEPlane(true);
    setShowHPlane(true);
    setShowPolarCage(true);
    setAutoOrbit(false);
    handleSelectCameraPreset('reset');
  };

  return (
    <div className="lab-shell">
      <a href="#lab-workspace" className="skip-link">
        Skip to antenna controls
      </a>

      <LabHeader
        params={params}
        autoOrbit={autoOrbit}
        theme={theme}
        onToggleAutoOrbit={() => setAutoOrbit((prev) => !prev)}
        onToggleTheme={toggleTheme}
      />

      <main className="lab-main">
        <div className="viewport-pane" aria-label="3D radiation chamber">
          <AntennaLabCanvas
            params={params}
            scenario={scenario}
            scaleMode={scaleMode}
            showWireframe={showWireframe}
            showEPlane={showEPlane}
            showHPlane={showHPlane}
            showPolarCage={showPolarCage}
            autoOrbit={autoOrbit}
            prefersReducedMotion={prefersReducedMotion}
            presetRequest={presetRequest}
            theme={theme}
          />
          <ViewportOverlay
            gainDbi={params.gainDbi}
            scenarioId={scenario.id}
            onSelectCameraPreset={handleSelectCameraPreset}
          />
        </div>

        <InspectorPanel
          params={params}
          scenario={scenario}
          scaleMode={scaleMode}
          showWireframe={showWireframe}
          showEPlane={showEPlane}
          showHPlane={showHPlane}
          showPolarCage={showPolarCage}
          onChangeParams={setParams}
          onChangeScenario={setScenario}
          onChangeScaleMode={setScaleMode}
          onToggleWireframe={() => setShowWireframe((prev) => !prev)}
          onToggleEPlane={() => setShowEPlane((prev) => !prev)}
          onToggleHPlane={() => setShowHPlane((prev) => !prev)}
          onTogglePolarCage={() => setShowPolarCage((prev) => !prev)}
          onResetDefaults={handleResetDefaults}
        />
      </main>

      <footer className="lab-footer">
        <p>
          AntennaLab 3D: analytical far-field simulator for{' '}
          <a
            href="https://andresptr.site/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Andre Saputra
          </a>
          .
        </p>
        <span>All patterns computed locally in WebGL.</span>
      </footer>
    </div>
  );
}

export default App;
