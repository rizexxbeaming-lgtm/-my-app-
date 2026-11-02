import { mnemonicToPrivateKey } from "@ton/crypto";
import { TonClient, WalletContractV5R1 } from "@ton/ton";
import { fromNano } from "@ton/core";
import { networkGlobalId } from "./env.js";

export function w5FromPublicKey(publicKey: Buffer) {
  return WalletContractV5R1.create({
    walletId: {
      networkGlobalId: networkGlobalId(),
      context: {
        workchain: 0,
        walletVersion: "v5r1",
        subwalletNumber: 0,
      },
    },
    publicKey,
  });
}

export async function openW5FromMnemonic(client: TonClient, mnemonic: string) {
  const key = await mnemonicToPrivateKey(mnemonic.split(/\s+/));
  const wallet = w5FromPublicKey(key.publicKey);
  const opened = client.open(wallet);

  const state = await client.getContractState(wallet.address);
  if (state.state !== "active") {
    throw new Error(
      `Кошелёk ${wallet.address.toString()} не active на chain. ` +
        `Сделай любой исходящий перевод и повтори.`,
    );
  }

  await new Promise((r) => setTimeout(r, 1500));
  const balance = await client.getBalance(wallet.address);
  if (balance < 50_000_000n) {
    throw new Error(
      `Мало TON на payer (${fromNano(balance)}). Нужно ~0.08+ для trigger.`,
    );
  }

  return { key, wallet, opened };
}
