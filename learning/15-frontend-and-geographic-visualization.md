# 15 — Frontend and Geographic Visualization

## Variables and representation

React coordinates selected country, annual period, region and indicator. MapLibre renders local Natural Earth geometry; ECharts renders backend observations.

## Derivation and implementation

Country selection updates the inspector and history request. Failed requests, missing values and loading states are distinct. Flat/globe map mode does not change the underlying measurements.

[Read the implementation](../frontend/src/WorldMap.tsx).

## Worked example and expected behavior

Selecting Japan and year 2020 updates common-year metrics while history stops at 2020. Missing values are displayed as unavailable and line charts do not connect across them.

## Interview question

Why local map workers and no tile server? This keeps cartography functional after installation without network credentials or a recurring service.

## Limits

Natural Earth 1:110m is generalized, lacks small territories and uses de facto boundaries. A rendered border is not a political endorsement. Keyboard country controls provide a map alternative.
