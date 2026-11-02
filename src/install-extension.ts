import { mnemonicToPrivateKey } from "@ton/crypto";
import { Address } from "@ton/core";
import { TonClient, WalletContractV5R1 } from "@ton/ton";
import { loadConfig } from "./utils.js";
import { networkGlobalId, requireEnv, tonClientOptions } from "./env.js";

async function main() {
  const cfg = loadConfig();
  const relay = Address.parse(cfg.relayAddress);

  const key = await mnemonicToPrivateKey(requireEnv("MNEMONIC_A").split(/\s+/));
  const wallet = WalletContractV5R1.create({
    walletId: { networkGlobalId: networkGlobalId() },
    publicKey: key.publicKey,
    workchain: 0,
  });

  const client = new TonClient(tonClientOptions());
  const opened = client.open(wallet);

  if (!wallet.address.equals(Address.parse(cfg.walletA))) {
    throw new Error(
      "MNEMONIC_A / WALLET_VICTIM does not match walletA in lab-config.json — redeploy or fix .env",
    );
  }

  await opened.sendAddExtension({
    seqno: await opened.getSeqno(),
    secretKey: key.secretKey,
    timeout: Math.floor(Date.now() / 1000) + 600,
    extensionAddress: relay,
  });

  console.log("add_extension sent for relay:", relay.toString());
  console.log("Check Tonviewer → get_extensions on", cfg.walletA);
  console.log("Then: npm run trigger");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
