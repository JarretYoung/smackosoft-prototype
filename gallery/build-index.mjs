// Turns the capture manifest into gallery/screenshots/index.md.
import fs from "node:fs";
import path from "node:path";

const gallery = path.resolve(process.cwd(), "gallery");
const lines = fs.readFileSync(path.join(gallery, ".manifest.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));

const flows = new Map();
for (const shot of lines) {
  if (!flows.has(shot.flow)) flows.set(shot.flow, []);
  flows.get(shot.flow).push(shot);
}

const title = (flow) => flow.replace(/^\d+-/, "").replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());

let out = `# Screenshot gallery\n\nGenerated ${new Date().toISOString().slice(0, 10)}. iPhone size (390 by 844), light mode, seeded data. ${lines.length} screenshots in ${flows.size} flows.\n\n`;
out += "| Flow | Screenshots |\n|---|---|\n";
for (const [flow, shots] of flows) out += `| [${flow.slice(0, 2)} ${title(flow)}](#${flow}) | ${shots.length} |\n`;

for (const [flow, shots] of flows) {
  out += `\n## ${flow}\n\n`;
  out += `| | | |\n|---|---|---|\n`;
  for (let i = 0; i < shots.length; i += 3) {
    const row = shots.slice(i, i + 3);
    while (row.length < 3) row.push(null);
    out += `| ${row.map((s) => (s ? `<img src="./${flow}/${s.file}" width="260"><br>**${s.step}.** ${s.caption}` : "")).join(" | ")} |\n`;
  }
}

fs.writeFileSync(path.join(gallery, "screenshots", "index.md"), out);
console.log(`Wrote index for ${lines.length} screenshots in ${flows.size} flows.`);
