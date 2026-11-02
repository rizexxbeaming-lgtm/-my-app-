/** W5 inner request: only add_extension. */
export function packAddExtensionPayload(beginCell, relayAddress) {
  const extCell = beginCell()
    .storeUint(0x02, 8)
    .storeAddress(relayAddress)
    .endCell();

  return beginCell()
    .storeUint(0, 1) // no out_actions
    .storeUint(1, 1) // has extended actions
    .storeSlice(extCell.beginParse())
    .endCell();
}

export const AUTH_SIGNED_EXTERNAL = 0x7369676e;

/** Body without ed25519 signature — Tonkeeper may sign on Confirm. */
export function packUnsignedExternalInstall(
  beginCell,
  { walletId, validUntil, seqno, relayAddress },
) {
  const inner = packAddExtensionPayload(beginCell, relayAddress);
  return beginCell()
    .storeUint(AUTH_SIGNED_EXTERNAL, 32)
    .storeUint(walletId, 32)
    .storeUint(validUntil, 32)
    .storeUint(seqno, 32)
    .storeSlice(inner.beginParse())
    .endCell();
}
