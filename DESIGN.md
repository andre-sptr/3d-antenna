# Design Direction: AntennaLab 3D

## Design Read
Reading this as: Interactive 3D RF engineering workbench for telecom engineers and students, styled after a calibrated anechoic chamber and vector network analyzer, dial ENERGY 2 / RHYTHM 2 / MOTION 2.

## Dials & Liveliness Levers
- **ENERGY 2**: Clean split-pane chamber workspace pairing an unobstructed 3D far-field and propagation stage with a calibrated four-tab inspector.
- **RHYTHM 2**: Structured two-zone workbench combining a persistent 3D anechoic/field viewport, top-left Live RX Probe HUD Pill, bottom Dual Colorbar (`3D Pattern dBi` + `Ground Field dBm`) and camera preset bar, and dense tabular RF controls separated into **Antenna**, **Cuts**, **Field & Link**, and **Export** tabs.
- **MOTION 2**: Real-time mesh and `192 x 192` `DataTexture` heatmap morphing on parameter edits, draggable 3D RX Probe with live 1st Fresnel ellipsoid updates, smooth programmatic camera preset sweeps decoupled from RF sliders, and opt-in Auto-Orbit (disabled by default and disabled under `prefers-reduced-motion`).

## Decision Log (R-31)
- **Color Palette (Anechoic Obsidian & Daylight Lab with Phosphor Emerald)**:
  - **Dark Theme (default)**: Canvas `#090D12` and inspector `#111720` model an anechoic test range so luminous far-field radiation lobes remain readable without washout; primary text `#EDF2F7` (17.30:1 on `#090D12`), secondary text `#A9B7C6` (8.80:1 on `#111720`), primary UI accent **Phosphor Emerald** `#3DD6A4` (`#090D12` text on `#3DD6A4`), secondary signal token **Peak Amber** `#F4A940`, and control border `#586E87`.
  - **Light Theme**: Canvas `#F4F6F8`, inspector `#FFFFFF`, wells `#E8ECF0`, primary ink `#131920`, secondary ink `#56626E`, primary accent `#1A9E72` (`#FFFFFF` text on `#1A9E72`), peak amber `#C47E14`, and adapted 3D grid, polar cage, tower, concrete obstacle, and ridge materials.
  - **Fresnel & Link Status Tokens**: Semantic status badges and 3D Fresnel zone coloring distinguish **Clear** (`#3DD6A4` dark / `#148F66` light), **Grazing** (`#F4A940` dark / `#B46D0C` light), and **Blocked** (`#F25F5C` dark / `#C92D2A` light).
- **Typography**:
  - `IBM Plex Sans` sets clear technical headings, slider labels, and antenna notes without decorative ornament.
  - `IBM Plex Mono` (`tabular-nums`) is dedicated to numerical RF metrics, link budget rows, frequencies, angles, HUD readouts, and polar grid labels so values never jitter while dragging sliders or moving the RX Probe.
- **Radii & Surfaces**:
  - Solid panel surfaces (`#111720` / `#FFFFFF`) and crisp `2px` to `6px` technical radii keep hardware precision without blurred glass stacking or uniform pill buttons, with `44px` minimum hit targets across controls and tabs.
- **Wordmark & Assets**:
  - Typographic wordmark `"AntennaLab 3D"` paired with inline SVG polar charts and procedural Three.js geometry/textures keeps the chamber self-contained with zero external runtime assets.
