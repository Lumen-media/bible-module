import { readFileSync, writeFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));

if (pkg.version) manifest.version = pkg.version;
if (pkg.description) manifest.description = pkg.description;

writeFileSync("manifest.json", JSON.stringify(manifest, null, 2) + "\n");
