import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InspectorPanel } from './components/InspectorPanel';
import { LabHeader } from './components/LabHeader';
import { ViewportOverlay } from './components/ViewportOverlay';
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion';
import { useTheme } from './hooks/useTheme';
import {
  DEFAULT_ANTENNA_PARAMS,
  DEFAULT_RX_PROBE,
  DEFAULT_SCENARIO,
  type AntennaParams,
  type PropagationModel,
  type RxProbeConfig,
  type ScaleMode,
  type ScenarioConfig,
} from './lib/antennaPhysics';
import { buildExportFilename, downloadDataUrl } from './lib/exporters';
import { evaluateLinkBudget } from './lib/propagationPhysics';
import {
  decodeLabStateFromQuery,
  encodeLabStateToQuery,
} from './lib/urlState';
import { AntennaLabCanvas } from './scene/AntennaLabCanvas';
import type { CameraPresetId } from './scene/CameraRig';
import { isWebGLAvailable } from './scene/webglSupport';

export function App() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { theme, toggleTheme } = useTheme();

  const [initialState] = useState(() =>
    typeof window !== 'undefined'
      ? decodeLabStateFromQuery(window.location.search)
      : decodeLabStateFromQuery(''),
  );

  const [params, setParams] = useState<AntennaParams>(initialState.params);
  const [scenario, setScenario] = useState<ScenarioConfig>(initialState.scenario);
  const [propagationModel, setPropagationModel] = useState<PropagationModel>(
    initialState.propagationModel,
  );
  const [scaleMode, setScaleMode] = useState<ScaleMode>(initialState.scaleMode);
  const [rxProbe, setRxProbe] = useState<RxProbeConfig>(initialState.rxProbe);

  const [showWireframe, setShowWireframe] = useState(false);
  const [showEPlane, setShowEPlane] = useState(true);
  const [showHPlane, setShowHPlane] = useState(true);
  const [showPolarCage, setShowPolarCage] = useState(true);
  const [autoOrbit, setAutoOrbit] = useState(false);
  const [presetRequest, setPresetRequest] = useState<{
    preset: CameraPresetId;
    seq: number;
  }>({ preset: 'iso', seq: 0 });

  const snapshotCaptureRef = useRef<(() => string | null) | null>(null);
  const lastQueryRef = useRef<string>(encodeLabStateToQuery(initialState));
  const [canCaptureSnapshot] = useState(() => isWebGLAvailable());

  const linkBudget = useMemo(() => {
    if (scenario.id === 'anechoic' || !rxProbe.enabled) {
      return null;
    }
    return evaluateLinkBudget(params, scenario, rxProbe, propagationModel);
  }, [params, scenario, rxProbe, propagationModel]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const nextQuery = encodeLabStateToQuery({
      params,
      scenario,
      propagationModel,
      scaleMode,
      rxProbe,
    });
    if (nextQuery === lastQueryRef.current) {
      return;
    }
    const timer = window.setTimeout(() => {
      lastQueryRef.current = nextQuery;
      window.history.replaceState(null, '', nextQuery);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [params, scenario, propagationModel, scaleMode, rxProbe]);

  const handleSelectCameraPreset = (preset: CameraPresetId) => {
    setPresetRequest((prev) => ({ preset, seq: prev.seq + 1 }));
  };

  const handleMoveRxProbe = useCallback((xMeters: number, zMeters: number) => {
    setRxProbe((prev) => ({
      ...prev,
      enabled: true,
      xMeters,
      zMeters,
    }));
  }, []);

  const handleCopyShareUrl = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') {
      return false;
    }
    const query = encodeLabStateToQuery({
      params,
      scenario,
      propagationModel,
      scaleMode,
      rxProbe,
    });
    lastQueryRef.current = query;
    window.history.replaceState(null, '', query);
    const fullUrl = `${window.location.origin}${window.location.pathname}${query}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      return true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = fullUrl;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(ta);
        return copied;
      } catch {
        return false;
      }
    }
  }, [params, scenario, propagationModel, scaleMode, rxProbe]);

  const handleCapturePng = useCallback(() => {
    const dataUrl = snapshotCaptureRef.current?.();
    if (dataUrl) {
      downloadDataUrl(buildExportFilename(params, 'png'), dataUrl);
    }
  }, [params]);

  const handleResetDefaults = () => {
    const defaultState = {
      params: DEFAULT_ANTENNA_PARAMS,
      scenario: DEFAULT_SCENARIO,
      propagationModel: 'fspl' as PropagationModel,
      scaleMode: 'log' as ScaleMode,
      rxProbe: DEFAULT_RX_PROBE,
    };
    setParams(DEFAULT_ANTENNA_PARAMS);
    setScenario(DEFAULT_SCENARIO);
    setPropagationModel('fspl');
    setScaleMode('log');
    setRxProbe(DEFAULT_RX_PROBE);
    setShowWireframe(false);
    setShowEPlane(true);
    setShowHPlane(true);
    setShowPolarCage(true);
    setAutoOrbit(false);
    lastQueryRef.current = encodeLabStateToQuery(defaultState);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname);
    }
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
            propagationModel={propagationModel}
            scaleMode={scaleMode}
            showWireframe={showWireframe}
            showEPlane={showEPlane}
            showHPlane={showHPlane}
            showPolarCage={showPolarCage}
            autoOrbit={autoOrbit}
            prefersReducedMotion={prefersReducedMotion}
            presetRequest={presetRequest}
            theme={theme}
            rxProbe={rxProbe}
            linkBudget={linkBudget}
            onMoveRxProbe={handleMoveRxProbe}
            snapshotCaptureRef={snapshotCaptureRef}
          />
          <ViewportOverlay
            gainDbi={params.gainDbi}
            scenarioId={scenario.id}
            propagationModel={propagationModel}
            rxProbeEnabled={rxProbe.enabled}
            linkBudget={linkBudget}
            onSelectCameraPreset={handleSelectCameraPreset}
          />
        </div>

        <InspectorPanel
          params={params}
          scenario={scenario}
          propagationModel={propagationModel}
          rxProbe={rxProbe}
          linkBudget={linkBudget}
          scaleMode={scaleMode}
          showWireframe={showWireframe}
          showEPlane={showEPlane}
          showHPlane={showHPlane}
          showPolarCage={showPolarCage}
          theme={theme}
          canCaptureSnapshot={canCaptureSnapshot}
          onChangeParams={setParams}
          onChangeScenario={setScenario}
          onChangePropagationModel={setPropagationModel}
          onChangeRxProbe={setRxProbe}
          onChangeScaleMode={setScaleMode}
          onToggleWireframe={() => setShowWireframe((prev) => !prev)}
          onToggleEPlane={() => setShowEPlane((prev) => !prev)}
          onToggleHPlane={() => setShowHPlane((prev) => !prev)}
          onTogglePolarCage={() => setShowPolarCage((prev) => !prev)}
          onCopyShareUrl={handleCopyShareUrl}
          onCapturePng={handleCapturePng}
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
