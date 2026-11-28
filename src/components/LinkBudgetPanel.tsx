import {
  SERVICE_PROFILE_LIST,
  SERVICE_PROFILES,
  type FresnelStatus,
  type LinkQuality,
  type PropagationModel,
  type RxProbeConfig,
} from '../lib/antennaPhysics';
import type { LinkBudgetResult } from '../lib/propagationPhysics';
import { RangeSlider } from './RangeSlider';

interface LinkBudgetPanelProps {
  rxProbe: RxProbeConfig;
  linkBudget: LinkBudgetResult | null;
  propagationModel: PropagationModel;
  onChangeRxProbe: (next: RxProbeConfig) => void;
}

const FRESNEL_STATUS_LABELS: Record<FresnelStatus, string> = {
  clear: 'Clear LOS (>=60% F1)',
  grazing: 'Fresnel Grazing',
  blocked: 'NLOS Obstructed',
};

const LINK_QUALITY_LABELS: Record<LinkQuality, string> = {
  excellent: 'Excellent',
  good: 'Good',
  marginal: 'Marginal',
  'no-link': 'No Link',
};

export function LinkBudgetPanel({
  rxProbe,
  linkBudget,
  propagationModel,
  onChangeRxProbe,
}: LinkBudgetPanelProps) {
  return (
    <section className="control-group" aria-labelledby="rx-probe-heading">
      <h2 id="rx-probe-heading" className="group-heading">
        RX Probe &amp; Link Budget
      </h2>

      <p className="topology-note">
        Click ground heatmap or drag the 3D marker to evaluate Fresnel clearance and link margin.
      </p>

      <div className="checkbox-grid">
        <label className="check-item" htmlFor="chk-rx-probe">
          <input
            id="chk-rx-probe"
            type="checkbox"
            checked={rxProbe.enabled}
            onChange={() =>
              onChangeRxProbe({ ...rxProbe, enabled: !rxProbe.enabled })
            }
          />
          <span>Enable RX Probe</span>
        </label>

        <label className="check-item" htmlFor="chk-fresnel">
          <input
            id="chk-fresnel"
            type="checkbox"
            checked={rxProbe.showFresnel}
            disabled={!rxProbe.enabled}
            onChange={() =>
              onChangeRxProbe({ ...rxProbe, showFresnel: !rxProbe.showFresnel })
            }
          />
          <span>1st Fresnel Zone</span>
        </label>
      </div>

      {rxProbe.enabled && (
        <>
          <div className="sector-width-row">
            <span className="slider-label">Service Profile</span>
            <div className="preset-chips" role="group" aria-label="Receiver service profile">
              {SERVICE_PROFILE_LIST.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  className="chip-btn"
                  aria-pressed={rxProbe.serviceProfile === profile.id}
                  onClick={() =>
                    onChangeRxProbe({
                      ...rxProbe,
                      serviceProfile: profile.id,
                      rxGainDbi: SERVICE_PROFILES[profile.id].defaultRxGainDbi,
                    })
                  }
                >
                  {profile.label}
                </button>
              ))}
            </div>
          </div>

          <RangeSlider
            id="slider-rx-x"
            label="Probe East/West (X)"
            value={rxProbe.xMeters}
            min={-36}
            max={36}
            step={0.5}
            unit="m"
            formatValue={(v) => v.toFixed(1)}
            onChange={(xMeters) => onChangeRxProbe({ ...rxProbe, xMeters })}
          />

          <RangeSlider
            id="slider-rx-z"
            label="Probe South/North (Z)"
            value={rxProbe.zMeters}
            min={-36}
            max={36}
            step={0.5}
            unit="m"
            formatValue={(v) => v.toFixed(1)}
            onChange={(zMeters) => onChangeRxProbe({ ...rxProbe, zMeters })}
          />

          <RangeSlider
            id="slider-rx-h"
            label="RX Antenna Height"
            value={rxProbe.rxHeightM}
            min={0.5}
            max={25}
            step={0.5}
            unit="m"
            formatValue={(v) => v.toFixed(1)}
            onChange={(rxHeightM) => onChangeRxProbe({ ...rxProbe, rxHeightM })}
          />

          <RangeSlider
            id="slider-rx-gain"
            label="RX Antenna Gain"
            value={rxProbe.rxGainDbi}
            min={0}
            max={24}
            step={0.5}
            unit="dBi"
            formatValue={(v) => v.toFixed(1)}
            onChange={(rxGainDbi) => onChangeRxProbe({ ...rxProbe, rxGainDbi })}
          />

          {linkBudget && (
            <div className="budget-card">
              <div
                className="budget-status-banner"
                data-status={linkBudget.fresnelStatus}
              >
                <span>
                  {linkBudget.insideBuilding
                    ? 'Inside Building Footprint'
                    : FRESNEL_STATUS_LABELS[linkBudget.fresnelStatus]}
                </span>
                <span className="mono-num">
                  {LINK_QUALITY_LABELS[linkBudget.linkQuality]}
                </span>
              </div>

              <dl className="budget-list">
                <div className="budget-row">
                  <dt>Slant Dist · Bearing</dt>
                  <dd className="mono-num">
                    {linkBudget.slantDistanceM.toFixed(1)} m ·{' '}
                    {Math.round(linkBudget.bearingDeg)}° (
                    {linkBudget.elevationAngleDeg >= 0 ? '+' : ''}
                    {linkBudget.elevationAngleDeg.toFixed(1)}°)
                  </dd>
                </div>
                <div className="budget-row">
                  <dt>TX EIRP</dt>
                  <dd className="mono-num">+{linkBudget.eirpDbm.toFixed(1)} dBm</dd>
                </div>
                <div className="budget-row">
                  <dt>Pattern Loss</dt>
                  <dd className="mono-num">
                    -{linkBudget.txPatternLossDb.toFixed(1)} dB
                  </dd>
                </div>
                <div className="budget-row">
                  <dt>Free-Space Loss (FSPL)</dt>
                  <dd className="mono-num">-{linkBudget.fsplDb.toFixed(1)} dB</dd>
                </div>
                {propagationModel === 'two-ray' && (
                  <div className="budget-row">
                    <dt>2-Ray Multipath Delta</dt>
                    <dd className="mono-num">
                      {linkBudget.twoRayDeltaDb >= 0 ? '+' : ''}
                      {linkBudget.twoRayDeltaDb.toFixed(1)} dB
                    </dd>
                  </div>
                )}
                {linkBudget.diffractionLossDb > 0.05 && (
                  <div className="budget-row">
                    <dt>Knife-Edge Diffraction</dt>
                    <dd className="mono-num">
                      -{linkBudget.diffractionLossDb.toFixed(1)} dB
                    </dd>
                  </div>
                )}
                {linkBudget.penetrationLossDb > 0.05 && (
                  <div className="budget-row">
                    <dt>Building Penetration</dt>
                    <dd className="mono-num">
                      -{linkBudget.penetrationLossDb.toFixed(1)} dB
                    </dd>
                  </div>
                )}
                <div className="budget-row">
                  <dt>RX Antenna Gain</dt>
                  <dd className="mono-num">+{linkBudget.rxGainDbi.toFixed(1)} dBi</dd>
                </div>
                <div className="budget-row budget-row-total">
                  <dt>Received Power</dt>
                  <dd className="mono-num">{linkBudget.rxPowerDbm.toFixed(1)} dBm</dd>
                </div>
                <div className="budget-row budget-row-margin">
                  <dt>Fade Margin (vs {linkBudget.sensitivityDbm} dBm)</dt>
                  <dd className="mono-num">
                    {linkBudget.fadeMarginDb >= 0 ? '+' : ''}
                    {linkBudget.fadeMarginDb.toFixed(1)} dB
                  </dd>
                </div>
                <div className="budget-row">
                  <dt>1st Fresnel Radius (Max)</dt>
                  <dd className="mono-num">
                    {linkBudget.fresnelMaxRadiusM.toFixed(2)} m
                  </dd>
                </div>
                {linkBudget.obstacleHeightAtRayM !== null && (
                  <div className="budget-row">
                    <dt>Obstacle F1 Clearance</dt>
                    <dd className="mono-num">
                      {linkBudget.fresnelClearanceM >= 0 ? '+' : ''}
                      {linkBudget.fresnelClearanceM.toFixed(2)} m (
                      {Math.round(linkBudget.fresnelClearancePct)}%)
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </>
      )}
    </section>
  );
}
