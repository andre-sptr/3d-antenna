# AntennaLab 3D | Interactive RF Radiation & Propagation Lab

Interactive 3D far-field antenna pattern, Fresnel clearance, and RF link budget workbench targeting `https://antenna.andresptr.site`.

## Implemented Features

- **6 Analytical Antenna Models** (`src/lib/antennaPhysics.ts`):
  - **Half-Wave Dipole**: symmetric toroidal pattern with zenith/nadir nulls and ~78 deg elevation HPBW.
  - **Collinear Omni**: vertical array factor scaling with gain (`3 dBi` to `12 dBi`), narrowing vertical beamwidth and revealing sidelobes.
  - **Yagi-Uda**: directional end-fire main lobe with configurable gain (`7 dBi` to `15 dBi`) and front-to-back ratio.
  - **Microstrip Patch**: broadside hemispherical lobe (`6 dBi` to `10 dBi`) with ground-plane back-lobe suppression.
  - **Parabolic Dish**: circular-aperture Airy diffraction pattern `|2 * J1(u) / u|` (`18 dBi` to `30 dBi`) with narrow pencil beam and concentric sidelobe rings.
  - **Sectoral BTS**: independent horizontal beamwidth (`65 deg` / `90 deg` / `120 deg`) and narrow elevation array steering via mechanical/electrical downtilt (`-15 deg` to `+15 deg`).
- **3D Slicer, Polar Cuts & Dark/Light Theme** (`src/scene/RadiationLobeMesh.tsx`, `src/components/PolarPlot2D.tsx`):
  - Toggle E-Plane (amber) and H-Plane (emerald) cross-sections in 3D alongside live 2D SVG polar charts, `-3 dB` HPBW metrics, and logarithmic (`dBi`) / linear power scales.
  - Smooth preset camera navigation (`Iso 3D`, `Top`, `Side`, `Boresight`, `Reset`) decoupled from parameter edits so manual orbit stays locked while dragging sliders.
  - Full Dark & Light theme parity across the UI and 3D scene elements (`useTheme`).
- **4 Propagation Environments & Physics Models** (`src/lib/propagationMath.ts`, `src/lib/propagationPhysics.ts`, `src/scene/PropagationEnvironment.tsx`):
  - **Anechoic Chamber**: calibrated compass ring, elevation arcs, and axis markers.
  - **Open Field Tower**: elevated mast (`2 m` to `40 m`) radiating onto a sharp `192 x 192` `THREE.DataTexture` ground footprint signal heatmap (`dBm`) with Dual Colorbar (`dBi` + `dBm`).
  - **Urban Blockage**: adjustable building distance and height casting frequency-dependent **ITU-R P.526-15 single knife-edge diffraction** shadows plus indoor penetration loss (`18 dB`) inside the building footprint.
  - **Ridge Crest**: sloped Gaussian terrain ridge evaluating line-of-sight clearance versus ITU-R P.526 terrain diffraction loss.
  - **Free Space (FSPL) vs 2-Ray Ground Reflection**: toggle between free-space propagation and coherent vertical-polarization 2-ray ground reflection with multipath interference rings.
- **Interactive 3D RX Probe, 1st Fresnel Zone & Link Budget** (`src/scene/RxProbe3D.tsx`, `src/components/LinkBudgetPanel.tsx`):
  - Click anywhere on the ground heatmap or drag the 3D RX Probe marker (`-36 m` to `+36 m`, adjustable RX height and gain) to inspect live link telemetry.
  - Procedural 3D LOS ray and 1st Fresnel ellipsoid ($r_{F1}$) with obstacle-plane intersection ring and semantic status (`Clear`, `Grazing`, `Blocked`) mirrored in the top-left Live RX HUD Pill.
  - Receiver service profiles (**5G NR / LTE**, **Wi-Fi 6**, **LoRa / LPWAN**, **PtP Microwave**) calculating slant distance, EIRP, pattern loss, FSPL, 2-ray delta, diffraction/penetration loss, received power (`dBm`), and fade margin (`dB`).
- **Engineering Exports, URL Sync & LinkSight RF Handoff** (`src/lib/exporters.ts`, `src/lib/urlState.ts`, `src/components/ExportPanel.tsx`):
  - Download **MSI/Planet (`.msi`)** (`360° H / 360° V` attenuation tables), **3D Pattern Grid (`.csv`)** (`5°` spherical dataset), **2D Polar Cuts (`.svg`)** standalone datasheets, and **3D Viewport (`.png`)** high-DPI WebGL snapshots.
  - Live debounced URL query-parameter synchronization with one-click share link copy and direct parameter handoff (`freq`, `gain`, `txPower`, `azimuth`, `downtilt`, `towerHeight`, `beamwidth`) to `https://rf.andresptr.site/`.

## Scripts

```bash
npm run dev        # Start local Vite dev server on 127.0.0.1:5174
npm run typecheck  # Run TypeScript compiler checks
npm run lint       # Run ESLint across all TypeScript/TSX sources
npm test           # Run 17 RF physics, propagation, and exporter unit tests with Vitest
npm run build      # Typecheck and output static production bundle to dist/
npm run preview    # Preview production dist/ bundle on 127.0.0.1:4174
```
