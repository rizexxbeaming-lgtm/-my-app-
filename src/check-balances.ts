import "dotenv/config";
import { TonClient } from "@ton/ton";
import { Address, fromNano } from "@ton/core";
import { tonClientOptions } from "./env.js";
import { loadConfig } from "./utils.js";

const client = new TonClient(tonClientOptions());
const cfg = loadConfig();

const wallets = [
  ["Victim A", cfg.walletA],
  ["Receiver B", cfg.walletB],
  ["Relay", cfg.relayAddress],
];

for (const [label, addr] of wallets) {
  await new Promise((r) => setTimeout(r, 1500));
  try {
    const bal = await client.getBalance(Address.parse(addr));
    console.log(`${label}: ${fromNano(bal)} TON`);
  } catch (e: any) {
    console.log(`${label}: error - ${e.message}`);
  }
}
