import {
  ANTENNA_CATALOG,
  DEFAULT_ANTENNA_PARAMS,
  DEFAULT_RX_PROBE,
  DEFAULT_SCENARIO,
  type AntennaParams,
  type AntennaType,
  type PropagationModel,
  type RxProbeConfig,
  type ScaleMode,
  type ScenarioConfig,
  type ScenarioId,
  type SectorBeamwidthDeg,
  type ServiceProfileId,
} from './antennaPhysics';
import { clampNumber } from './propagationMath';

export interface ShareableLabState {
  params: AntennaParams;
  scenario: ScenarioConfig;
  propagationModel: PropagationModel;
  scaleMode: ScaleMode;
  rxProbe: RxProbeConfig;
}

const VALID_ANTENNA_TYPES = new Set<AntennaType>([
  'dipole',
  'omni',
  'yagi',
  'patch',
  'dish',
  'sector',
]);

const VALID_SCENARIOS = new Set<ScenarioId>([
  'anechoic',
  'open-field',
  'urban',
  'ridge',
]);

const VALID_BEAMWIDTHS = new Set<SectorBeamwidthDeg>([65, 90, 120]);
const VALID_SERVICES = new Set<ServiceProfileId>(['5g', 'wifi6', 'lora', 'ptp']);

function fmtNum(val: number): string {
  return String(Math.round(val * 100) / 100);
}

function parseFinite(raw: string | null, fallback: number): number {
  if (raw === null || raw.trim() === '') return fallback;
  const num = Number(raw);
  return Number.isFinite(num) ? num : fallback;
}

export function encodeLabStateToQuery(state: ShareableLabState): string {
  const q = new URLSearchParams();
  q.set('type', state.params.type);
  q.set('f', fmtNum(state.params.frequencyMHz));
  q.set('g', fmtNum(state.params.gainDbi));
  q.set('p', fmtNum(state.params.txPowerDbm));
  q.set('az', fmtNum(state.params.azimuthDeg));
  q.set('tilt', fmtNum(state.params.downtiltDeg));
  if (state.params.type === 'sector') {
    q.set('bw', String(state.params.sectorBeamwidthDeg));
  }
  q.set('sc', state.scenario.id);
  q.set('th', fmtNum(state.scenario.towerHeightM));
  q.set('od', fmtNum(state.scenario.obstacleDistanceM));
  q.set('oh', fmtNum(state.scenario.obstacleHeightM));
  q.set('pm', state.propagationModel);
  q.set('scale', state.scaleMode);
  q.set('rx', state.rxProbe.enabled ? '1' : '0');
  q.set('rxx', fmtNum(state.rxProbe.xMeters));
  q.set('rxz', fmtNum(state.rxProbe.zMeters));
  q.set('rxh', fmtNum(state.rxProbe.rxHeightM));
  q.set('rxg', fmtNum(state.rxProbe.rxGainDbi));
  q.set('rxs', state.rxProbe.serviceProfile);
  return `?${q.toString()}`;
}

export function decodeLabStateFromQuery(search: string): ShareableLabState {
  const q = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);

  const rawType = q.get('type') as AntennaType | null;
  const type: AntennaType =
    rawType && VALID_ANTENNA_TYPES.has(rawType)
      ? rawType
      : DEFAULT_ANTENNA_PARAMS.type;
  const meta = ANTENNA_CATALOG[type];

  const rawBw = parseFinite(q.get('bw'), DEFAULT_ANTENNA_PARAMS.sectorBeamwidthDeg);
  const sectorBeamwidthDeg: SectorBeamwidthDeg = VALID_BEAMWIDTHS.has(
    rawBw as SectorBeamwidthDeg,
  )
    ? (rawBw as SectorBeamwidthDeg)
    : DEFAULT_ANTENNA_PARAMS.sectorBeamwidthDeg;

  const params: AntennaParams = {
    type,
    frequencyMHz: clampNumber(
      parseFinite(q.get('f'), meta.defaultFreqMHz),
      100,
      6000,
    ),
    gainDbi: clampNumber(
      parseFinite(q.get('g'), meta.defaultGainDbi),
      meta.minGainDbi,
      meta.maxGainDbi,
    ),
    txPowerDbm: clampNumber(
      parseFinite(q.get('p'), DEFAULT_ANTENNA_PARAMS.txPowerDbm),
      10,
      46,
    ),
    azimuthDeg: clampNumber(
      parseFinite(q.get('az'), DEFAULT_ANTENNA_PARAMS.azimuthDeg),
      0,
      360,
    ),
    downtiltDeg: clampNumber(
      parseFinite(q.get('tilt'), DEFAULT_ANTENNA_PARAMS.downtiltDeg),
      -15,
      15,
    ),
    sectorBeamwidthDeg,
  };

  const rawScenario = q.get('sc') as ScenarioId | null;
  const scenarioId: ScenarioId =
    rawScenario && VALID_SCENARIOS.has(rawScenario)
      ? rawScenario
      : DEFAULT_SCENARIO.id;

  const scenario: ScenarioConfig = {
    id: scenarioId,
    towerHeightM: clampNumber(
      parseFinite(q.get('th'), DEFAULT_SCENARIO.towerHeightM),
      2,
      40,
    ),
    obstacleDistanceM: clampNumber(
      parseFinite(q.get('od'), DEFAULT_SCENARIO.obstacleDistanceM),
      8,
      32,
    ),
    obstacleHeightM: clampNumber(
      parseFinite(q.get('oh'), DEFAULT_SCENARIO.obstacleHeightM),
      4,
      26,
    ),
  };

  const propagationModel: PropagationModel =
    q.get('pm') === 'two-ray' ? 'two-ray' : 'fspl';
  const scaleMode: ScaleMode = q.get('scale') === 'linear' ? 'linear' : 'log';

  const rawService = q.get('rxs') as ServiceProfileId | null;
  const serviceProfile: ServiceProfileId =
    rawService && VALID_SERVICES.has(rawService)
      ? rawService
      : DEFAULT_RX_PROBE.serviceProfile;

  const rxProbe: RxProbeConfig = {
    enabled: q.get('rx') === '0' ? false : DEFAULT_RX_PROBE.enabled,
    xMeters: clampNumber(parseFinite(q.get('rxx'), DEFAULT_RX_PROBE.xMeters), -36, 36),
    zMeters: clampNumber(parseFinite(q.get('rxz'), DEFAULT_RX_PROBE.zMeters), -36, 36),
    rxHeightM: clampNumber(
      parseFinite(q.get('rxh'), DEFAULT_RX_PROBE.rxHeightM),
      0.5,
      25,
    ),
    rxGainDbi: clampNumber(
      parseFinite(q.get('rxg'), DEFAULT_RX_PROBE.rxGainDbi),
      0,
      24,
    ),
    showFresnel: DEFAULT_RX_PROBE.showFresnel,
    serviceProfile,
  };

  return { params, scenario, propagationModel, scaleMode, rxProbe };
}

export function buildLinkSightUrl(
  params: AntennaParams,
  scenario: ScenarioConfig,
): string {
  const q = new URLSearchParams({
    source: 'antennalab',
    antennaType: params.type,
    freq: fmtNum(params.frequencyMHz),
    gain: fmtNum(params.gainDbi),
    txPower: fmtNum(params.txPowerDbm),
    azimuth: fmtNum(params.azimuthDeg),
    downtilt: fmtNum(params.downtiltDeg),
    towerHeight: fmtNum(scenario.towerHeightM),
  });
  if (params.type === 'sector') {
    q.set('beamwidth', String(params.sectorBeamwidthDeg));
  }
  return `https://rf.andresptr.site/?${q.toString()}`;
}
