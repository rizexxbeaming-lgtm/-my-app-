import "dotenv/config";
import { TonClient } from "@ton/ton";
import { Address } from "@ton/core";
import { tonClientOptions } from "./env.js";
import { isRelayExtensionInstalled } from "./extensions-check.js";
import { loadConfig } from "./utils.js";

const client = new TonClient(tonClientOptions());
const cfg = loadConfig();
const victim = Address.parse(cfg.walletA);
const relay = Address.parse(cfg.relayAddress);

console.log("Victim:", victim.toString());
console.log("Relay:", relay.toString());

await new Promise((r) => setTimeout(r, 1500));
const installed = await isRelayExtensionInstalled(client, victim, relay);
console.log("Extension installed:", installed);
