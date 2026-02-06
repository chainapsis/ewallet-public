import type {
  Point256,
  UserKeySharePointByNode,
  TeddsaKeyShareByNode,
} from "@oko-wallet/oko-types/user_key_share";
import { Bytes } from "@oko-wallet/bytes";
import { hexToTeddsaKeyShare } from "@oko-wallet/oko-types/user_key_share";
import type { Result } from "@oko-wallet/stdlib-js";

export function decodeKeyShareStringToPoint256(
  keyShare: string,
): Result<Point256, string> {
  if (keyShare.length !== 128) {
    return {
      success: false,
      err: "Key share must be 128 characters(64 bytes) long",
    };
  }

  const x = Bytes.fromHexString(keyShare.slice(0, 64), 32);
  if (x.success === false) {
    return {
      success: false,
      err: x.err,
    };
  }
  const y = Bytes.fromHexString(keyShare.slice(64, 128), 32);
  if (y.success === false) {
    return {
      success: false,
      err: y.err,
    };
  }
  return {
    success: true,
    data: { x: x.data, y: y.data },
  };
}

export function encodePoint256ToKeyShareString(point: Point256): string {
  return `${point.x.toHex()}${point.y.toHex()}`;
}

export async function decodeSecp256k1SharesByNode(
  sharesData: Array<{
    node: { name: string; endpoint: string };
    shares: { secp256k1?: string };
  }>,
): Promise<
  Result<
    UserKeySharePointByNode[],
    { type: "key_share_combine_fail"; error: string }
  >
> {
  const sharesByNode: UserKeySharePointByNode[] = [];

  for (const item of sharesData) {
    const shareHex = item.shares.secp256k1;
    if (!shareHex) {
      return {
        success: false,
        err: {
          type: "key_share_combine_fail",
          error: `secp256k1 share missing from node: ${item.node.name}`,
        },
      };
    }
    const point256Res = decodeKeyShareStringToPoint256(shareHex);
    if (point256Res.success === false) {
      return {
        success: false,
        err: {
          type: "key_share_combine_fail",
          error: `secp256k1 decode err: ${point256Res.err}`,
        },
      };
    }
    sharesByNode.push({
      node: item.node,
      share: point256Res.data,
    });
  }

  return { success: true, data: sharesByNode };
}

export function decodeEd25519SharesByNode(
  sharesData: Array<{
    node: { name: string; endpoint: string };
    shares: { ed25519?: string };
  }>,
): Result<
  TeddsaKeyShareByNode[],
  { type: "key_share_combine_fail"; error: string }
> {
  const sharesByNode: TeddsaKeyShareByNode[] = [];

  for (const item of sharesData) {
    const shareHex = item.shares.ed25519;
    if (!shareHex) {
      return {
        success: false,
        err: {
          type: "key_share_combine_fail",
          error: `ed25519 share missing from node: ${item.node.name}`,
        },
      };
    }
    try {
      const teddsaShare = hexToTeddsaKeyShare(shareHex);
      sharesByNode.push({
        node: item.node,
        share: teddsaShare,
      });
    } catch (e) {
      return {
        success: false,
        err: {
          type: "key_share_combine_fail",
          error: `ed25519 decode err: ${String(e)}`,
        },
      };
    }
  }

  return { success: true, data: sharesByNode };
}
