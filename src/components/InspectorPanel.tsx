import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  ANTENNA_CATALOG,
  ANTENNA_LIST,
  FREQUENCY_PRESETS,
  SCENARIO_LIST,
  computeAntennaMetrics,
  type AntennaParams,
  type AntennaType,
  type ScaleMode,
  type ScenarioConfig,
  type SectorBeamwidthDeg,
} from '../lib/antennaPhysics';
import { PolarPlot2D } from './PolarPlot2D';
import { RangeSlider } from './RangeSlider';

type TabId = 'antenna' | 'cuts' | 'environment';

const TABS: readonly { id: TabId; label: string }[] = [
  { id: 'antenna', label: 'Antenna' },
  { id: 'cuts', label: 'Cuts & Polar' },
  { id: 'environment', label: 'Environment' },
];

interface InspectorPanelProps {
  params: AntennaParams;
  scenario: ScenarioConfig;
  scaleMode: ScaleMode;
  showWireframe: boolean;
  showEPlane: boolean;
  showHPlane: boolean;
  showPolarCage: boolean;
  onChangeParams: (next: AntennaParams) => void;
  onChangeScenario: (next: ScenarioConfig) => void;
  onChangeScaleMode: (mode: ScaleMode) => void;
  onToggleWireframe: () => void;
  onToggleEPlane: () => void;
  onToggleHPlane: () => void;
  onTogglePolarCage: () => void;
  onResetDefaults: () => void;
}

export function InspectorPanel({
  params,
  scenario,
  scaleMode,
  showWireframe,
  showEPlane,
  showHPlane,
  showPolarCage,
  onChangeParams,
  onChangeScenario,
  onChangeScaleMode,
  onToggleWireframe,
  onToggleEPlane,
  onToggleHPlane,
  onTogglePolarCage,
  onResetDefaults,
}: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('antenna');
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    antenna: null,
    cuts: null,
    environment: null,
  });
  const panelRefs = useRef<Record<TabId, HTMLDivElement | null>>({
    antenna: null,
    cuts: null,
    environment: null,
  });

  useEffect(() => {
    const cleanups: Array<() => void> = [];
    for (const tab of TABS) {
      const panelEl = panelRefs.current[tab.id];
      if (!panelEl) continue;
      const onBeforeMatch = () => {
        setActiveTab(tab.id);
      };
      panelEl.addEventListener('beforematch', onBeforeMatch);
      cleanups.push(() => panelEl.removeEventListener('beforematch', onBeforeMatch));
    }
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, []);

  const activeMeta = ANTENNA_CATALOG[params.type];
  const metrics = useMemo(() => computeAntennaMetrics(params), [params]);

  const handleSelectAntenna = (type: AntennaType) => {
    const meta = ANTENNA_CATALOG[type];
    onChangeParams({
      ...params,
      type,
      gainDbi: meta.defaultGainDbi,
      frequencyMHz: meta.defaultFreqMHz,
    });
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    let nextIdx: number | null = null;
    if (event.key === 'ArrowRight') {
      nextIdx = (idx + 1) % TABS.length;
    } else if (event.key === 'ArrowLeft') {
      nextIdx = (idx - 1 + TABS.length) % TABS.length;
    } else if (event.key === 'Home') {
      nextIdx = 0;
    } else if (event.key === 'End') {
      nextIdx = TABS.length - 1;
    }
    if (nextIdx !== null) {
      event.preventDefault();
      const targetTab = TABS[nextIdx];
      setActiveTab(targetTab.id);
      tabRefs.current[targetTab.id]?.focus();
    }
  };

  return (
    <aside className="inspector-pane" aria-label="RF laboratory controls">
      <div className="inspector-head">
        <h1 id="lab-workspace" tabIndex={-1} className="inspector-title">
          Antenna Radiation Lab
        </h1>
        <p className="inspector-subtitle">
          Analytical far-field solver with E/H-plane slicing and propagation footprint
        </p>
      </div>

      <div
        className="inspector-tablist"
        role="tablist"
        aria-label="Laboratory control sections"
        {...({ focusgroup: 'tablist nomemory' } as Record<string, string>)}
      >
        {TABS.map((tab, idx) => {
          const isSelected = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              className="inspector-tab"
              {...(isSelected ? { focusgroupstart: '' } : {})}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, idx)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="inspector-scroll">
        {/* TAB 1: ANTENNA */}
        <div
          ref={(el) => {
            panelRefs.current.antenna = el;
          }}
          role="tabpanel"
          aria-labelledby="tab-antenna"
          tabIndex={activeTab === 'antenna' ? 0 : undefined}
          hidden={
            activeTab === 'antenna'
              ? undefined
              : ('until-found' as unknown as boolean)
          }
        >
          <div className="tab-panel-inner">
            <section className="control-group" aria-labelledby="topology-heading">
              <h2 id="topology-heading" className="group-heading">
                Antenna Topology
              </h2>
              <div className="antenna-grid">
                {ANTENNA_LIST.map((item) => {
                  const selected = item.id === params.type;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="choice-btn"
                      aria-pressed={selected}
                      onClick={() => handleSelectAntenna(item.id)}
                    >
                      {item.shortName}
                    </button>
                  );
                })}
              </div>
              <p className="topology-note">{activeMeta.summary}</p>
            </section>

            <section className="control-group" aria-labelledby="rf-params-heading">
              <h2 id="rf-params-heading" className="group-heading">
                RF &amp; Orientation Parameters
              </h2>

              <div className="preset-chips" role="group" aria-label="Frequency presets">
                {FREQUENCY_PRESETS.map((preset) => {
                  const active = Math.abs(params.frequencyMHz - preset.valueMHz) < 1;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      className="chip-btn mono-num"
                      aria-pressed={active}
                      onClick={() =>
                        onChangeParams({ ...params, frequencyMHz: preset.valueMHz })
                      }
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              <RangeSlider
                id="slider-freq"
                label="Frequency"
                value={params.frequencyMHz}
                min={100}
                max={6000}
                step={5}
                unit={params.frequencyMHz >= 1000 ? 'GHz' : 'MHz'}
                formatValue={(v) =>
                  v >= 1000 ? (v / 1000).toFixed(2) : v.toFixed(1)
                }
                onChange={(frequencyMHz) =>
                  onChangeParams({ ...params, frequencyMHz })
                }
              />

              <RangeSlider
                id="slider-gain"
                label="Peak Gain"
                value={params.gainDbi}
                min={activeMeta.minGainDbi}
                max={activeMeta.maxGainDbi}
                step={activeMeta.gainStepDbi}
                unit="dBi"
                disabled={activeMeta.minGainDbi === activeMeta.maxGainDbi}
                formatValue={(v) => v.toFixed(2).replace(/\.00$/, '.0')}
                onChange={(gainDbi) => onChangeParams({ ...params, gainDbi })}
              />

              <RangeSlider
                id="slider-power"
                label="TX Power"
                value={params.txPowerDbm}
                min={10}
                max={46}
                step={1}
                unit="dBm"
                onChange={(txPowerDbm) =>
                  onChangeParams({ ...params, txPowerDbm })
                }
              />

              <RangeSlider
                id="slider-azimuth"
                label="Azimuth Rotation"
                value={params.azimuthDeg}
                min={0}
                max={360}
                step={2}
                unit="deg"
                onChange={(azimuthDeg) =>
                  onChangeParams({ ...params, azimuthDeg })
                }
              />

              <RangeSlider
                id="slider-downtilt"
                label="Elevation Tilt"
                value={params.downtiltDeg}
                min={-15}
                max={15}
                step={1}
                unit="deg"
                formatValue={(v) => (v > 0 ? `+${v} (down)` : String(v))}
                onChange={(downtiltDeg) =>
                  onChangeParams({ ...params, downtiltDeg })
                }
              />

              {params.type === 'sector' && (
                <div className="sector-width-row">
                  <span className="slider-label">Sector Azimuth Width</span>
                  <div className="preset-chips" role="group" aria-label="Sector beamwidth">
                    {([65, 90, 120] as SectorBeamwidthDeg[]).map((bw) => (
                      <button
                        key={bw}
                        type="button"
                        className="chip-btn mono-num"
                        aria-pressed={params.sectorBeamwidthDeg === bw}
                        onClick={() =>
                          onChangeParams({ ...params, sectorBeamwidthDeg: bw })
                        }
                      >
                        {bw} deg
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* TAB 2: CUTS & POLAR */}
        <div
          ref={(el) => {
            panelRefs.current.cuts = el;
          }}
          role="tabpanel"
          aria-labelledby="tab-cuts"
          tabIndex={activeTab === 'cuts' ? 0 : undefined}
          hidden={
            activeTab === 'cuts'
              ? undefined
              : ('until-found' as unknown as boolean)
          }
        >
          <div className="tab-panel-inner">
            <section className="control-group" aria-labelledby="scale-heading">
              <h2 id="scale-heading" className="group-heading">
                Pattern Scale &amp; Slicers
              </h2>

              <div className="scale-toggle" role="group" aria-label="Radiation plot scale">
                <button
                  type="button"
                  className="choice-btn"
                  aria-pressed={scaleMode === 'log'}
                  onClick={() => onChangeScaleMode('log')}
                >
                  Logarithmic (dBi)
                </button>
                <button
                  type="button"
                  className="choice-btn"
                  aria-pressed={scaleMode === 'linear'}
                  onClick={() => onChangeScaleMode('linear')}
                >
                  Linear Power
                </button>
              </div>

              <div className="checkbox-grid">
                <label className="check-item" htmlFor="chk-eplane">
                  <input
                    id="chk-eplane"
                    type="checkbox"
                    checked={showEPlane}
                    onChange={onToggleEPlane}
                  />
                  <span>E-Plane Slice</span>
                </label>

                <label className="check-item" htmlFor="chk-hplane">
                  <input
                    id="chk-hplane"
                    type="checkbox"
                    checked={showHPlane}
                    onChange={onToggleHPlane}
                  />
                  <span>H-Plane Slice</span>
                </label>

                <label className="check-item" htmlFor="chk-wireframe">
                  <input
                    id="chk-wireframe"
                    type="checkbox"
                    checked={showWireframe}
                    onChange={onToggleWireframe}
                  />
                  <span>Mesh Wireframe</span>
                </label>

                <label className="check-item" htmlFor="chk-cage">
                  <input
                    id="chk-cage"
                    type="checkbox"
                    checked={showPolarCage}
                    onChange={onTogglePolarCage}
                  />
                  <span>Polar Reference Rings</span>
                </label>
              </div>
            </section>

            <section className="control-group" aria-labelledby="polar-heading">
              <h2 id="polar-heading" className="group-heading">
                2D Principal Plane Cuts
              </h2>
              <PolarPlot2D params={params} scaleMode={scaleMode} />
            </section>

            <section className="control-group" aria-labelledby="metrics-heading">
              <h2 id="metrics-heading" className="group-heading">
                Computed RF Telemetry
              </h2>
              <dl className="metrics-grid">
                <div className="metric-cell">
                  <dt>Azimuth HPBW</dt>
                  <dd className="mono-num">{metrics.azimuthHpbwDeg}°</dd>
                </div>
                <div className="metric-cell">
                  <dt>Elevation HPBW</dt>
                  <dd className="mono-num">{metrics.elevationHpbwDeg}°</dd>
                </div>
                <div className="metric-cell">
                  <dt>F/B Ratio</dt>
                  <dd className="mono-num">{metrics.frontToBackDb} dB</dd>
                </div>
                <div className="metric-cell">
                  <dt>Peak EIRP</dt>
                  <dd className="mono-num">{metrics.peakEirpDbm} dBm</dd>
                </div>
                <div className="metric-cell">
                  <dt>Wavelength</dt>
                  <dd className="mono-num">
                    {metrics.wavelengthM < 0.25
                      ? `${(metrics.wavelengthM * 100).toFixed(1)} cm`
                      : `${metrics.wavelengthM.toFixed(2)} m`}
                  </dd>
                </div>
                <div className="metric-cell">
                  <dt>Quarter-Wave</dt>
                  <dd className="mono-num">
                    {metrics.quarterWaveM < 1
                      ? `${(metrics.quarterWaveM * 100).toFixed(1)} cm`
                      : `${metrics.quarterWaveM.toFixed(2)} m`}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </div>

        {/* TAB 3: ENVIRONMENT */}
        <div
          ref={(el) => {
            panelRefs.current.environment = el;
          }}
          role="tabpanel"
          aria-labelledby="tab-environment"
          tabIndex={activeTab === 'environment' ? 0 : undefined}
          hidden={
            activeTab === 'environment'
              ? undefined
              : ('until-found' as unknown as boolean)
          }
        >
          <div className="tab-panel-inner">
            <section className="control-group" aria-labelledby="scenario-heading">
              <h2 id="scenario-heading" className="group-heading">
                Propagation Environment
              </h2>
              <div className="scenario-list">
                {SCENARIO_LIST.map((item) => {
                  const selected = item.id === scenario.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="scenario-btn"
                      aria-pressed={selected}
                      onClick={() =>
                        onChangeScenario({ ...scenario, id: item.id })
                      }
                    >
                      <strong>{item.label}</strong>
                      <span>{item.description}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {scenario.id !== 'anechoic' && (
              <section className="control-group" aria-labelledby="geometry-heading">
                <h2 id="geometry-heading" className="group-heading">
                  Tower &amp; Obstacle Geometry
                </h2>

                <RangeSlider
                  id="slider-tower-h"
                  label="Tower Mast Height"
                  value={scenario.towerHeightM}
                  min={2}
                  max={40}
                  step={1}
                  unit="m"
                  onChange={(towerHeightM) =>
                    onChangeScenario({ ...scenario, towerHeightM })
                  }
                />

                {(scenario.id === 'urban' || scenario.id === 'ridge') && (
                  <>
                    <RangeSlider
                      id="slider-obs-dist"
                      label={
                        scenario.id === 'urban'
                          ? 'Building Distance'
                          : 'Ridge Crest Distance'
                      }
                      value={scenario.obstacleDistanceM}
                      min={8}
                      max={32}
                      step={1}
                      unit="m"
                      onChange={(obstacleDistanceM) =>
                        onChangeScenario({ ...scenario, obstacleDistanceM })
                      }
                    />

                    <RangeSlider
                      id="slider-obs-height"
                      label={
                        scenario.id === 'urban'
                          ? 'Building Height'
                          : 'Ridge Peak Height'
                      }
                      value={scenario.obstacleHeightM}
                      min={4}
                      max={26}
                      step={1}
                      unit="m"
                      onChange={(obstacleHeightM) =>
                        onChangeScenario({ ...scenario, obstacleHeightM })
                      }
                    />
                  </>
                )}
              </section>
            )}

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
        </div>
      </div>
    </aside>
  );
}
