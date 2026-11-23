# AntennaLab 3D (`3d-antenna`)

## Architecture & Runtime
- Static single-page 3D RF radiation and propagation laboratory built with Vite 8, React 19, TypeScript, Tailwind CSS v4, and React Three Fiber for `https://antenna.andresptr.site`.
- Static build outputs to `dist/` and is intended for OpenResty serving at `/opt/1panel/apps/openresty/openresty/www/sites/antenna.andresptr.site/index`.

## Verification Commands
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Test: `npm test`
- Build: `npm run build`

## Guardrails
- Keep the 3D scene self-contained using procedural Three.js geometry and local lighting (never fetch external HDRI presets or remote `.glb` assets at runtime).
- Verify `dist/` output cleanly with zero console errors across desktop and mobile breakpoints before deploying to `/opt/1panel/apps/openresty/openresty/www/sites/antenna.andresptr.site/index`.
- Never commit `.env` or secret values.
