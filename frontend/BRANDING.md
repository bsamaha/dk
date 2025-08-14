Brand integration
=================

This app implements the brand book tokens and typography for TheSignalCallers.

Where to edit
-------------
- Theme tokens: `src/theme/brand.ts`
- Global CSS variables: `src/index.css` (see `--color-*`, `--radius-card`, `--space-m`, `--elev-card`)
- Mantine provider wiring: `src/main.tsx`
- Component examples using brand tokens: `src/components/tools/OddsCalculatorTab.tsx`

Colors
------
- signal (primary): `#00A86B`
- gold (highlight): `#FFC300`
- turf (dark green): `#016140`
- graphite (neutral/dark): `#1E1E1E`

Typography
----------
- Inter for UI text
- Space Grotesk for headings and KPI numerals

Components defaulted
--------------------
- Card: `radius=md`, bordered
- Button: `color=signal`
- Tooltip/Badge: color presets corresponding to brand palettes

Update these files to change global brand behavior. Ensure WCAG AA contrast on new surfaces.
