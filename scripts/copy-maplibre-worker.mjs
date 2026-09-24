#!/usr/bin/env node
// MapLibre 6 runs its map worker from separate ES module files, which the
// Next.js bundler does not emit. Serve them from our own origin (allowed by the
// CSP's 'self') so they always match the installed maplibre-gl version.
import { copyFile, mkdir } from "node:fs/promises";

const FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];
const target = "public/vendor/maplibre";
await mkdir(target, { recursive: true });
for (const file of FILES) {
  await copyFile(`node_modules/maplibre-gl/dist/${file}`, `${target}/${file}`);
}
console.log(`copy-maplibre-worker: copied ${FILES.length} files to ${target}`);
