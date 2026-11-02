/** Vercel serverless: seqno + subwallet_id (CORS-friendly). */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const address = req.query.address;
  const network = req.query.network === "mainnet" ? "mainnet" : "testnet";
  if (!address || typeof address !== "string") {
    res.status(400).json({ error: "address required" });
    return;
  }

  const base =
    network === "mainnet" ? "https://tonapi.io" : "https://testnet.tonapi.io";

  function parseStackNum(entry) {
    if (entry == null) return null;
    if (typeof entry.num === "string") {
      const s = entry.num.startsWith("0x") ? entry.num : `0x${entry.num}`;
      return Number(BigInt(s)) >>> 0;
    }
    return null;
  }

  try {
    const enc = encodeURIComponent(address);
    const [seqRes, idRes] = await Promise.all([
      fetch(`${base}/v2/wallet/${enc}/seqno`),
      fetch(`${base}/v2/blockchain/accounts/${enc}/methods/get_subwallet_id`),
    ]);

    if (!seqRes.ok || !idRes.ok) {
      res.status(502).json({ error: "tonapi upstream error" });
      return;
    }

    const seqJson = await seqRes.json();
    const idJson = await idRes.json();

    let walletId = null;
    if (typeof idJson.return_value === "number") {
      walletId = idJson.return_value >>> 0;
    } else {
      walletId =
        parseStackNum(idJson.decoded?.[0]) ??
        parseStackNum(idJson.stack?.[0]);
    }

    if (walletId == null) {
      res.status(502).json({ error: "could not parse wallet_id" });
      return;
    }

    res.status(200).json({
      seqno: seqJson.seqno,
      walletId,
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
