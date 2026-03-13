import { Bytes } from "@oko-wallet/bytes";
import * as wasmModule from "@oko-wallet/cait-sith-keplr-wasm/pkg/cait_sith_keplr_wasm";
import type {
  PointNumArr,
  UserKeySharePointByNode,
} from "@oko-wallet/oko-types/user_key_share";
import type { Result } from "@oko-wallet/stdlib-js";

export async function combineUserShares(
  userKeySharePoints: UserKeySharePointByNode[],
  threshold: number,
): Promise<Result<string, string>> {
  try {
    if (threshold < 2) {
      return {
        success: false,
        err: "Threshold must be at least 2",
      };
    }

    if (userKeySharePoints.length < threshold) {
      return {
        success: false,
        err: "Number of user key shares is less than threshold",
      };
    }

    const points: PointNumArr[] = userKeySharePoints.map(
      (userKeySharePoint) => ({
        x: [...userKeySharePoint.share.x.toUint8Array()],
        y: [...userKeySharePoint.share.y.toUint8Array()],
      }),
    );
    const combinedKeyNumArr = await wasmModule.sss_combine(points, threshold);

    const combinedKey = Bytes.fromUint8Array(
      Uint8Array.from(combinedKeyNumArr),
      32,
    );
    if (combinedKey.success === false) {
      return {
        success: false,
        err: `Failed to convert combined key to bytes: ${combinedKey.err}`,
      };
    }

    return {
      success: true,
      data: combinedKey.data.toHex(),
    };
  } catch (e) {
    return {
      success: false,
      err: String(e),
    };
  }
}
