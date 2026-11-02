import "dotenv/config";
import fs from "fs";
import path from "path";

const lab = path.join(process.cwd(), "lab-config.json");
const pub = path.join(process.cwd(), "public", "config.json");

if (!fs.existsSync(lab)) {
  console.error("lab-config.json missing — run npm run deploy first");
  process.exit(1);
}

const cfg = JSON.parse(fs.readFileSync(lab, "utf8"));
const network =
  Number(process.env.NETWORK_GLOBAL_ID ?? -3) === -239 ? "mainnet" : "testnet";

fs.writeFileSync(
  pub,
  JSON.stringify(
    {
      network,
      relayAddress: cfg.relayAddress,
      walletA: cfg.walletA,
      walletB: cfg.walletB,
      drainAmount: cfg.drainAmount ?? process.env.DRAIN_AMOUNT ?? "0.1",
    },
    null,
    2,
  ),
);
console.log("Wrote public/config.json (synced with lab-config.json)");
