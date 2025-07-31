import type { SpawnSyncReturns } from "node:child_process";

export function expectSuccess(ret: SpawnSyncReturns<ArrayBuffer>, msg: string) {
  if (ret.error) {
    console.error("Spawn err, %s", msg);

    throw ret.error;
  }
}
