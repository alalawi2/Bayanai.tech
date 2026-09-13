import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const source = process.argv[2];
if (!source)
  throw new Error("Pass the supplied Logos folder as the first argument.");
const names = {
  "bayan-ai": "BAYAN_AI_Technologies_Vector.svg",
  bayan: "BAYAN_LEARNING-flat-vector.svg",
  journalready: "JOURNALREADY-flat-vector.svg",
  medad: "MEDAD-flat-vector.svg",
  ohealth: "OHEALTH-flat-vector.svg",
  preop: "Prep_Logo_flat.svg",
  smartrota: "SmartRota_Logo_flat.svg",
};
mkdirSync("public/brand", { recursive: true });
// These Illustrator exports each wrap a single PNG, with no vector paths.
for (const [name, filename] of Object.entries(names)) {
  const svg = readFileSync(join(source, filename), "utf8");
  if ((svg.match(/<image /g) || []).length !== 1 || /<path /.test(svg)) {
    throw new Error(`Unexpected SVG structure: ${filename}`);
  }
  const data = svg.match(/xlink:href="data:image\/png;base64,([^"]+)"/);
  if (!data) throw new Error(`Missing embedded PNG: ${filename}`);
  const output = `public/brand/${name}.png`;
  writeFileSync(output, Buffer.from(data[1], "base64"));
  execFileSync("sips", ["-Z", "400", output, "--out", output]);
  console.log(output);
}
