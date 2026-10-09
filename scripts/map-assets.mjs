import { mkdirSync, copyFileSync } from "node:fs";
mkdirSync("frontend/public/maplibre", { recursive: true });
for (const name of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"])
  copyFileSync(
    `node_modules/maplibre-gl/dist/${name}`,
    `frontend/public/maplibre/${name}`,
  );
