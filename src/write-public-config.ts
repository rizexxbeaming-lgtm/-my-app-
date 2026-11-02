import fs from "fs";
import path from "path";
import type { LabConfig } from "./utils.js";
import { networkGlobalId } from "./env.js";

export function writePublicConfig(cfg: LabConfig) {
  const network =
    Number(process.env.NETWORK_GLOBAL_ID ?? networkGlobalId()) === -239
      ? "mainnet"
      : "testnet";

  const out = {
    network,
    relayAddress: cfg.relayAddress,
    walletA: cfg.walletA,
    walletB: cfg.walletB,
    drainAmount: cfg.drainAmount ?? process.env.DRAIN_AMOUNT ?? "0.1",
  };

  fs.writeFileSync(
    path.join(process.cwd(), "public", "config.json"),
    JSON.stringify(out, null, 2),
  );
}
