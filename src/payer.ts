import { requireEnv } from "./env.js";

/**
 * Payer for deploy + script trigger. Never falls back to MNEMONIC_A when WALLET_VICTIM is set
 * (TON Connect install — victim seed stays in Tonkeeper only).
 */
export function resolveTriggerMnemonic(): string {
  const trigger = process.env.MNEMONIC_TRIGGER?.trim();
  if (trigger) return trigger;

  const victimAddr = process.env.WALLET_VICTIM?.trim();
  if (victimAddr) {
    throw new Error(
      "TON Connect flow: set MNEMONIC_TRIGGER (payer). Do not use victim MNEMONIC_A as payer.",
    );
  }

  const legacy = process.env.MNEMONIC_A?.trim();
  if (legacy) return legacy;

  throw new Error("Set MNEMONIC_TRIGGER in .env (deploy gas + npm run trigger).");
}
