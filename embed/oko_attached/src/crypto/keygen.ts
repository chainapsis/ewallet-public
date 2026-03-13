import { Bytes, type Bytes32 } from "@oko-wallet/bytes";
import type { KeygenOutputBytes } from "@oko-wallet/cait-sith-keplr-hooks/src/types";
import * as wasmModule from "@oko-wallet/cait-sith-keplr-wasm/pkg/cait_sith_keplr_wasm";
import type { KeyShareNodeMetaWithNodeStatusInfo } from "@oko-wallet/oko-types/tss";
import type {
  PointNumArr,
  UserKeySharePointByNode,
} from "@oko-wallet/oko-types/user_key_share";
import type { Result } from "@oko-wallet/stdlib-js";

import { hashKeyshareNodeNames } from "./hash";

export async function splitUserKeyShares(
  keygen_1: KeygenOutputBytes,
  keyshareNodeMeta: KeyShareNodeMetaWithNodeStatusInfo,
): Promise<Result<UserKeySharePointByNode[], string>> {
  try {
    const keygen1PrivateShareBytes: Bytes32 = keygen_1.tss_private_share;

    const keyshareNodeHashesRes = await hashKeyshareNodeNames(
      keyshareNodeMeta.nodes.map((meta) => meta.name),
    );
    if (keyshareNodeHashesRes.success === false) {
      return {
        success: false,
        err: keyshareNodeHashesRes.err,
      };
    }
    const keyshareNodeHashes = keyshareNodeHashesRes.data.map((bytes) => {
      return [...bytes.toUint8Array()];
    });

    const split_points = await wasmModule.sss_split(
      [...keygen1PrivateShareBytes.toUint8Array()],
      keyshareNodeHashes,
      keyshareNodeMeta.threshold,
    );

    const shares: UserKeySharePointByNode[] = split_points.map(
      (point: PointNumArr, index: number) => {
        const xBytesRes = Bytes.fromUint8Array(
          Uint8Array.from([...point.x]),
          32,
        );
        if (xBytesRes.success === false) {
          throw new Error(xBytesRes.err);
        }
        const yBytesRes = Bytes.fromUint8Array(
          Uint8Array.from([...point.y]),
          32,
        );
        if (yBytesRes.success === false) {
          throw new Error(yBytesRes.err);
        }
        return {
          node: {
            name: keyshareNodeMeta.nodes[index].name,
            endpoint: keyshareNodeMeta.nodes[index].endpoint,
          },
          share: {
            x: xBytesRes.data,
            y: yBytesRes.data,
          },
        };
      },
    );

    return {
      success: true,
      data: shares,
    };
  } catch (error: any) {
    return {
      success: false,
      err: `${String(error)}`,
    };
  }
}
