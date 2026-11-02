import dotenv from "dotenv";

dotenv.config();

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) throw new Error(`Missing ${name} in .env`);
  return v.trim();
}

export function networkGlobalId(): number {
  return Number(process.env.NETWORK_GLOBAL_ID ?? -3);
}

export function tonClientOptions() {
  const endpoint = requireEnv("TON_ENDPOINT");
  const apiKey = process.env.TONCENTER_API_KEY?.trim();
  return {
    endpoint,
    ...(apiKey ? { apiKey } : {}),
  };
}
