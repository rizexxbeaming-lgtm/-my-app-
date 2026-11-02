import fs from "fs";
import path from "path";

const url = (process.argv[2] || "http://localhost:8080").replace(/\/$/, "");
const out = path.join(process.cwd(), "public", "tonconnect-manifest.json");

const manifest = {
  url,
  name: "W5 Extension Lab",
  iconUrl: "https://ton.org/download/ton_symbol.png",
};

fs.writeFileSync(out, JSON.stringify(manifest, null, 2));
console.log("Wrote", out, "url =", url);
