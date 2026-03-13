import { KEPLR_API_ENDPOINT } from "./endpoints";
import type {
  AssetMeta,
  AssetMetaParams,
} from "@oko-wallet-attached/types/asset_meta";

// const KEPLR_API_ENDPOINT = import.meta.env.NEXT_PUBLIC_KEPLR_API_ENDPOINT;

export async function postAssetMeta(
  params: AssetMetaParams,
): Promise<AssetMeta[]> {
  const response = await fetch(`${KEPLR_API_ENDPOINT}/v1/asset_meta`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    throw new Error(`postAssetMeta failed: ${response.status}`);
  }

  const data = (await response.json()) as AssetMeta[];
  return data;
}
