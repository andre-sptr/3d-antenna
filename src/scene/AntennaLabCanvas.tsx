import {
  Component,
  useState,
  type ReactNode,
} from 'react';
import { Canvas } from '@react-three/fiber';
import { PolarPlot2D } from '../components/PolarPlot2D';
import type { Theme } from '../hooks/useTheme';
import type {
  AntennaParams,
  ScaleMode,
  ScenarioConfig,
} from '../lib/antennaPhysics';
import { AntennaModels3D } from './AntennaModels3D';
import { CameraRig, type CameraPresetId } from './CameraRig';
import {
  METERS_TO_SCENE,
  PropagationEnvironment,
} from './PropagationEnvironment';
import { RadiationLobeMesh } from './RadiationLobeMesh';
import { isWebGLAvailable } from './webglSupport';

interface AntennaLabCanvasProps {
  params: AntennaParams;
  scenario: ScenarioConfig;
  scaleMode: ScaleMode;
  showWireframe: boolean;
  showEPlane: boolean;
  showHPlane: boolean;
  showPolarCage: boolean;
  autoOrbit: boolean;
  prefersReducedMotion: boolean;
  presetRequest: { preset: CameraPresetId; seq: number };
  theme: Theme;
}

class CanvasErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function AntennaLabCanvas({
  params,
  scenario,
  scaleMode,
  showWireframe,
  showEPlane,
  showHPlane,
  showPolarCage,
  autoOrbit,
  prefersReducedMotion,
  presetRequest,
  theme,
}: AntennaLabCanvasProps) {
  const [webglCapable, setWebglCapable] = useState(() => isWebGLAvailable());
  const [contextLost, setContextLost] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [attemptKey, setAttemptKey] = useState(0);

  const isAnechoic = scenario.id === 'anechoic';
  const feedY = isAnechoic ? 0 : Math.max(1.2, scenario.towerHeightM * METERS_TO_SCENE);
  const lobeRadius = isAnechoic ? 3.4 : 2.9;

  const bgColor = theme === 'dark' ? '#090D12' : '#E8ECF0';
  const fogColor = theme === 'dark' ? '#090D12' : '#E8ECF0';
  const hemiSky = theme === 'dark' ? '#B8D0E8' : '#D6E0EA';
  const hemiGround = theme === 'dark' ? '#111822' : '#B0B8C2';
  const hemiIntensity = theme === 'dark' ? 0.95 : 1.1;
  const keyIntensity = theme === 'dark' ? 1.35 : 1.6;
  const fillIntensity = theme === 'dark' ? 0.7 : 0.85;

  const handleRetry = () => {
    setWebglCapable(isWebGLAvailable());
    setContextLost(false);
    setSceneReady(false);
    setAttemptKey((prev) => prev + 1);
  };

  const fallbackView = (
    <div className="webgl-fallback" role="region" aria-label="2D polar fallback view">
      <div className="webgl-fallback-inner">
        <p className="fallback-status">
          3D WebGL viewport unavailable in this browser context. Live 2D far-field
          polar cuts remain active below.
        </p>
        <PolarPlot2D params={params} scaleMode={scaleMode} />
        <button type="button" className="btn-secondary" onClick={handleRetry}>
          Retry 3D view
        </button>
      </div>
    </div>
  );

  if (!webglCapable || contextLost) {
    return fallbackView;
  }

  return (
    <div className="canvas-stage">
      {!sceneReady && (
        <div className="stage-loading-pill" role="status">
          Initializing 3D RF chamber...
        </div>
      )}
      <CanvasErrorBoundary fallback={fallbackView}>
        <Canvas
          key={attemptKey}
          dpr={[1, 1.75]}
          camera={{ position: [6.0, 3.8, 6.6], fov: 44, near: 0.1, far: 120 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            setSceneReady(true);
            gl.domElement.addEventListener(
              'webglcontextlost',
              (event) => {
                event.preventDefault();
                setContextLost(true);
              },
              { once: true },
            );
          }}
        >
          <color attach="background" args={[bgColor]} />
          <fog attach="fog" args={[fogColor, 24, 65]} />

          <hemisphereLight args={[hemiSky, hemiGround, hemiIntensity]} />
          <directionalLight position={[10, 16, 10]} intensity={keyIntensity} color="#FFF4E5" />
          <directionalLight position={[-10, 8, -8]} intensity={fillIntensity} color="#8AC8EA" />

          <AntennaModels3D params={params} feedY={feedY} />

          <RadiationLobeMesh
            params={params}
            scaleMode={scaleMode}
            feedY={feedY}
            maxRadius={lobeRadius}
            showWireframe={showWireframe}
            showEPlane={showEPlane}
            showHPlane={showHPlane}
          />

          <PropagationEnvironment
            params={params}
            scenario={scenario}
            feedY={feedY}
            showPolarCage={showPolarCage}
          />

          <CameraRig
            presetRequest={presetRequest}
            feedY={feedY}
            azimuthDeg={params.azimuthDeg}
            isAnechoic={isAnechoic}
            autoOrbit={autoOrbit}
            prefersReducedMotion={prefersReducedMotion}
          />
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  );
}
