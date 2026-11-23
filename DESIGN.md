# Design Direction: AntennaLab 3D

## Design Read
Reading this as: Interactive 3D RF engineering workbench for telecom engineers and students, styled after a calibrated anechoic chamber and vector network analyzer, dial ENERGY 2 / RHYTHM 2 / MOTION 2.

## Dials & Liveliness Levers
- **ENERGY 2**: Clean split-pane chamber workspace pairing an unobstructed 3D far-field radiation stage with a calibrated three-tab inspector.
- **RHYTHM 2**: Structured two-zone workbench combining a persistent 3D anechoic/field viewport, corner colorbar and camera HUD, and dense tabular RF controls separated into Antenna, Cuts & Polar, and Environment tabs.
- **MOTION 2**: Real-time mesh morphing on parameter edits, smooth programmatic camera preset sweeps, and opt-in Auto-Orbit (disabled by default and disabled under `prefers-reduced-motion`).

## Decision Log (R-31)
- **Color Palette (Anechoic Obsidian & Phosphor Emerald)**:
  - Canvas `#090D12` and inspector `#111720` model an anechoic test range so luminous far-field radiation lobes remain readable without washout.
  - Primary text `#EDF2F7` (17.30:1 on `#090D12`) and secondary text `#A9B7C6` (8.80:1 on `#111720`) hold comfortable readability across long measurement sessions.
  - Single primary UI accent **Phosphor Emerald** `#3DD6A4` (9.73:1 text on `#111720`; `#090D12` text on `#3DD6A4` = 10.53:1) marks active controls, H-plane cuts, and focus rings.
  - Secondary signal token **Peak Amber** `#F4A940` distinguishes the vertical E-plane cut and maximum boresight peaks inside plots and 3D slices.
  - Control border `#586E87` achieves 3.42:1 non-text contrast against `#111720`.
- **Typography**:
  - `IBM Plex Sans` sets clear technical headings, slider labels, and antenna notes without decorative ornament.
  - `IBM Plex Mono` (`tabular-nums`) is dedicated to numerical RF metrics, frequencies, angles, and polar grid labels so values never jitter while dragging sliders.
- **Radii & Surfaces**:
  - Solid `#111720` inspector and crisp `2px` to `6px` technical radii keep hardware precision without blurred glass stacking or uniform pill buttons.
- **Wordmark & Assets**:
  - Typographic wordmark `"AntennaLab 3D"` avoids an assumed logo SVG; inline SVG polar charts represent computed far-field cuts directly.
