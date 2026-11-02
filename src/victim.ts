import { mnemonicToPrivateKey } from "@ton/crypto";
import { Address } from "@ton/core";
import { WalletContractV5R1 } from "@ton/ton";
import { networkGlobalId } from "./env.js";

export function victimConfigMode(): "ton-connect" | "mnemonic" {
  if (process.env.WALLET_VICTIM?.trim()) return "ton-connect";
  if (process.env.MNEMONIC_A?.trim()) return "mnemonic";
  return "ton-connect";
}

/** null = MNEMONIC_A not set (expected for TON Connect). */
export async function mnemonicMatchesVictim(victim: Address): Promise<boolean | null> {
  const mn = process.env.MNEMONIC_A?.trim();
  if (!mn) return null;
  const key = await mnemonicToPrivateKey(mn.split(/\s+/));
  const wallet = WalletContractV5R1.create({
    walletId: { networkGlobalId: networkGlobalId() },
    publicKey: key.publicKey,
    workchain: 0,
  });
  return wallet.address.equals(victim);
}

/** Victim W5 (C): WALLET_VICTIM (TON Connect) or address from MNEMONIC_A (script install). */
export async function resolveVictimAddress(): Promise<Address> {
  const fromEnv = process.env.WALLET_VICTIM?.trim();
  if (fromEnv) return Address.parse(fromEnv);

  const mn = process.env.MNEMONIC_A?.trim();
  if (!mn) {
    throw new Error(
      "Set WALLET_VICTIM to victim W5 address (TON Connect) or MNEMONIC_A for npm run install-ext",
    );
  }

  const key = await mnemonicToPrivateKey(mn.split(/\s+/));
  const wallet = WalletContractV5R1.create({
    walletId: { networkGlobalId: networkGlobalId() },
    publicKey: key.publicKey,
    workchain: 0,
  });
  return wallet.address;
}
