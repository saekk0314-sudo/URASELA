import { cp, mkdir, rm, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "dist");
const required = ["index.html", "src/app.js", "src/engine.js", "src/data.js", "src/styles.css", "manifest.webmanifest"];

for (const file of required) {
  const info = await stat(resolve(root, file));
  if (!info.isFile() || info.size === 0) throw new Error(`Required file is missing or empty: ${file}`);
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const entry of ["index.html", "manifest.webmanifest", "sw.js", "src", "assets"]) {
  await cp(resolve(root, entry), resolve(output, entry), { recursive: true });
}
console.log("URASELA static build completed: dist/");
