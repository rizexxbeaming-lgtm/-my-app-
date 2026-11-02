import "dotenv/config";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { TonClient, WalletContractV5R1 } from "@ton/ton";
import { fromNano } from "@ton/core";
import { networkGlobalId, tonClientOptions } from "./env.js";

const mn = process.env.MNEMONIC_TRIGGER!.trim().split(/\s+/);
const key = await mnemonicToPrivateKey(mn);
const wallet = WalletContractV5R1.create({
  walletId: { networkGlobalId: networkGlobalId() },
  publicKey: key.publicKey,
  workchain: 0,
});
console.log("Trigger W5 address:", wallet.address.toString());
console.log("Network:", networkGlobalId() === -3 ? "testnet" : "mainnet");

const client = new TonClient(tonClientOptions());
try {
  const bal = await client.getBalance(wallet.address);
  console.log("Balance:", fromNano(bal), "TON");
  const state = await client.getContractState(wallet.address);
  console.log("State:", state.state);
} catch (e: any) {
  console.error("Error:", e.message);
}
