# AntennaLab 3D | Interactive RF Radiation & Propagation Lab

Interactive 3D far-field antenna pattern and RF propagation workbench targeting `https://antenna.andresptr.site`.

## Implemented Features

- **6 Analytical Antenna Models** (`src/lib/antennaPhysics.ts`):
  - **Half-Wave Dipole**: symmetric toroidal pattern with zenith/nadir nulls and ~78 deg elevation HPBW.
  - **Collinear Omni**: vertical array factor scaling with gain (`3 dBi` to `12 dBi`), narrowing vertical beamwidth and revealing sidelobes.
  - **Yagi-Uda**: directional end-fire main lobe with configurable gain (`7 dBi` to `15 dBi`) and front-to-back ratio.
  - **Microstrip Patch**: broadside hemispherical lobe (`6 dBi` to `10 dBi`) with ground-plane back-lobe suppression.
  - **Parabolic Dish**: circular-aperture Airy diffraction pattern `|2 * J1(u) / u|` (`18 dBi` to `30 dBi`) with narrow pencil beam and concentric sidelobe rings.
  - **Sectoral BTS**: independent horizontal beamwidth (`65 deg` / `90 deg` / `120 deg`) and narrow elevation array steering via mechanical/electrical downtilt (`-15 deg` to `+15 deg`).
- **3D Slicer & Synchronized 2D SVG Polar Plots**: Toggle E-Plane (amber) and H-Plane (emerald) cross-sections in 3D alongside live 2D SVG polar charts and `-3 dB` HPBW metrics.
- **4 Propagation Scenarios**:
  - **Anechoic Chamber**: calibrated compass ring, elevation arcs, and axis markers.
  - **Open Field Tower**: adjustable tower height (`2 m` to `40 m`) with real-time `64 x 64` ground footprint signal heatmap (`dBm`).
  - **Urban Blockage**: adjustable building distance and height casting realistic RF shadow attenuation behind the obstacle.
  - **Ridge Crest**: sloped terrain ridge evaluating grazing clearance versus terrain shadowing.

## Scripts

```bash
npm run dev        # Start local Vite dev server on 127.0.0.1:5174
npm run typecheck  # Run TypeScript compiler checks
npm run lint       # Run ESLint across all TypeScript/TSX sources
npm test           # Run analytical RF physics unit tests with Vitest
npm run build      # Typecheck and output static production bundle to dist/
npm run preview    # Preview production dist/ bundle on 127.0.0.1:4174
```
