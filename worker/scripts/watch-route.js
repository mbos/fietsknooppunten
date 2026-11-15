// Maakt de testroute van het horloge (watch/resources/jsonData/route.json) uit lokaal.gpx,
// precies zoals de webapp hem verstuurt. Draai na een wijziging aan het routeformaat:
//   cd worker && npm run watch-route
import { readFileSync, writeFileSync } from "node:fs";
import { importGpx } from "../public/lib/gpx.js";
import { encode } from "../public/lib/route.js";

const repo = new URL("../../", import.meta.url);
const json = encode(importGpx(readFileSync(new URL("lokaal.gpx", repo), "utf8"), "lokaal"));
writeFileSync(new URL("watch/resources/jsonData/route.json", repo), json);
console.log(`route.json: ${json.length} bytes`);
