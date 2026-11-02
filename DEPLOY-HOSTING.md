# Install через Tonkeeper UI (localhost / Vercel / GitHub Pages)

## 0. Relay on-chain (один раз на ПК)

```bash
cd w5-extension-lab
cp .env.example .env
# WALLET_VICTIM = адрес C (W5), WALLET_B, MNEMONIC_TRIGGER (payer)
# MNEMONIC_A не нужен для install.html
npm install
npm run deploy
# public/config.json синхронизируется автоматически
```

## 1. Manifest URL (обязательно)

TON Connect требует, чтобы `tonconnect-manifest.json` → поле **`url`** совпадало с сайтом.

**Localhost**

```bash
npm run manifest:local
npm run serve:public
```

Открой: `http://127.0.0.1:8080/install.html`

**Vercel**

1. [vercel.com](https://vercel.com) → Import repo (или CLI `vercel` из папки `w5-extension-lab`).
2. Root Directory: **`w5-extension-lab`**
3. Framework: Other, Output: **`public`** (см. `vercel.json`).
4. Deploy → скопируй URL, например `https://w5-lab-xxx.vercel.app`
5. Локально:

```bash
node scripts/prepare-manifest.mjs https://w5-lab-xxx.vercel.app
node scripts/sync-config-from-lab.mjs
```

6. Закоммить `public/tonconnect-manifest.json` + `public/config.json` (или Vercel env + build step) и redeploy.

`/api/wallet-meta` работает на Vercel (seqno без CORS).

**GitHub Pages**

1. Repo → Settings → Pages → Source: GitHub Actions (или branch `/public`).
2. URL: `https://<user>.github.io/<repo>/`
3. Manifest:

```bash
node scripts/prepare-manifest.mjs https://USER.github.io/REPO
```

4. Положи содержимое `public/` в publishing root (или `docs/`).

Workflow пример: `.github/workflows/pages.yml` в репо.

## 2. Install в Tonkeeper

1. Открой **`/install.html`**
2. Connect → кошелёк **A (W5, testnet)**
3. **Install extension** → в Tonkeeper: warning **Add extension** → Confirm
4. Tonviewer → `get_extensions` → relay

## 3. Step 2

`index.html` на том же хосте (подтяни `relay` из `config.json` — см. index ниже).

## Если Tonkeeper отклоняет payload

В install.html переключи **Payload mode** → `inner actions only` и повтори.

Fallback: `npm run install-ext` (тот же on-chain результат).
