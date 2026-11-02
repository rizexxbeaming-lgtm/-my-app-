import { Address, Dictionary } from "@ton/core";
import { TonClient } from "@ton/ton";

function addressHashKey(address: Address): bigint {
  return BigInt(`0x${address.hash.toString("hex")}`);
}

/** True if relay is in victim W5 extensions dict. */
export async function isRelayExtensionInstalled(
  client: TonClient,
  victimAddress: Address,
  relayAddress: Address,
): Promise<boolean> {
  try {
    const res = await client.runMethod(victimAddress, "get_extensions");
    const cell = res.stack.readCellOpt();
    if (!cell) return false;

    const dict = Dictionary.loadDirect(
      Dictionary.Keys.BigUint(256),
      Dictionary.Values.BigInt(1),
      cell,
    );
    return dict.has(addressHashKey(relayAddress));
  } catch {
    return false;
  }
}
