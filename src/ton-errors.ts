export function formatTonSendError(e: unknown): string {
  const err = e as {
    response?: { data?: { error?: string; message?: string } };
    message?: string;
  };
  const lite =
    err.response?.data?.error ??
    err.response?.data?.message ??
    err.message ??
    String(e);

  if (lite.includes("inbound external message rejected")) {
    return (
      `${lite}\n\n` +
      `Чаще всего: seqno/подпись W5 не совпали с Tonkeeper, или payer ≠ тот кошелёk, что в Tonkeeper.\n` +
      `Обход: index.html → Connect payer → кнопка (Tonkeeper сам подпишет).\n` +
      `Либо отдельный MNEMONIC_TRIGGER (v5 с testnet TON), не путать с жертвой C.`
    );
  }
  return lite;
}
