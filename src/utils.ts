import { beginCell, Cell, MessageRelaxed, StateInit } from "@ton/core";
import fs from "fs";
import path from "path";

export function createMsgInternal(params: {
  bounce?: boolean;
  dest: import("@ton/core").Address;
  value: bigint;
  body?: Cell;
  init?: StateInit | null;
}): MessageRelaxed {
  return {
    info: {
      type: "internal",
      ihrDisabled: true,
      bounce: params.bounce ?? false,
      bounced: false,
      dest: params.dest,
      value: { coins: params.value },
      ihrFee: 0n,
      forwardFee: 0n,
      createdLt: 0n,
      createdAt: 0,
    },
    body: params.body ?? beginCell().endCell(),
    init: params.init,
  };
}

export type LabConfig = {
  relayAddress: string;
  walletA: string;
  walletB: string;
  innerActionsBoc: string;
  drainAmount: string;
};

export function loadConfig(): LabConfig {
  const p = path.join(process.cwd(), "lab-config.json");
  if (!fs.existsSync(p)) {
    throw new Error("Run npm run deploy first (lab-config.json missing)");
  }
  const raw = JSON.parse(fs.readFileSync(p, "utf8")) as LabConfig;
  if (!raw.drainAmount) {
    raw.drainAmount = process.env.DRAIN_AMOUNT ?? "0.1";
  }
  return raw;
}

export function saveConfig(cfg: LabConfig) {
  fs.writeFileSync(
    path.join(process.cwd(), "lab-config.json"),
    JSON.stringify(cfg, null, 2),
  );
}
