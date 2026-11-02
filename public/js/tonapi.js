export function tonApiBase(network) {
  return network === "mainnet"
    ? "https://tonapi.io"
    : "https://testnet.tonapi.io";
}

export async function fetchWalletSeqno(network, friendlyAddress) {
  const base = tonApiBase(network);
  const res = await fetch(`${base}/v2/wallet/${friendlyAddress}/seqno`);
  if (!res.ok) {
    throw new Error(`seqno: HTTP ${res.status}`);
  }
  const data = await res.json();
  if (typeof data.seqno !== "number") {
    throw new Error("seqno: unexpected response");
  }
  return data.seqno;
}

function parseStackNum(entry) {
  if (entry == null) return null;
  if (typeof entry === "number") return entry >>> 0;
  if (typeof entry.num === "string") {
    const s = entry.num.startsWith("0x") ? entry.num : `0x${entry.num}`;
    return Number(BigInt(s)) >>> 0;
  }
  return null;
}

export async function fetchSubwalletId(network, friendlyAddress) {
  const base = tonApiBase(network);
  const url = `${base}/v2/blockchain/accounts/${encodeURIComponent(friendlyAddress)}/methods/get_subwallet_id`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`get_subwallet_id: HTTP ${res.status}`);
  }
  const data = await res.json();
  if (data.success === false) {
    throw new Error("get_subwallet_id failed — нужен W5");
  }

  if (typeof data.return_value === "number") {
    return data.return_value >>> 0;
  }

  const fromDecoded = parseStackNum(data.decoded?.[0] ?? data.stack?.[0]);
  if (fromDecoded != null) return fromDecoded;

  throw new Error("Could not parse subwallet_id");
}
