import { compileFunc } from "@ton-community/func-js";
import fs from "fs";
import path from "path";
import { Cell } from "@ton/core";

export async function compileRelay(): Promise<Cell> {
  const candidates = [
    path.join(
      process.cwd(),
      "node_modules",
      "@ton-community/func-js",
      "dist",
      "stdlib",
      "stdlib.fc",
    ),
    path.join(process.cwd(), "node_modules", "func-js-bin", "lib/stdlib.fc"),
  ];
  const stdlibPath = candidates.find((p) => fs.existsSync(p));
  if (!stdlibPath) {
    throw new Error("stdlib.fc not found — run npm install");
  }
  const stdlib = fs.readFileSync(stdlibPath, "utf8");
  const source = fs.readFileSync(
    path.join(process.cwd(), "contracts", "extension_relay.fc"),
    "utf8",
  );

  const result = await compileFunc({
    targets: ["extension_relay.fc"],
    sources: {
      "stdlib.fc": stdlib,
      "extension_relay.fc": source,
    },
  });

  if (result.status === "error") {
    throw new Error(result.message);
  }

  return Cell.fromBoc(Buffer.from(result.codeBoc, "base64"))[0];
}
