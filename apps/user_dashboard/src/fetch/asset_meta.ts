import { KEPLR_API_ENDPOINT } from "@oko-wallet-user-dashboard/fetch";

export interface AssetMetaInput {
  chain_identifier: string;
  minimal_denom: string;
}

export interface AssetMetaParams {
  assets: AssetMetaInput[];
}

export interface AssetMeta {
  meta_id: string;
  chain_identifier: string;
  denom: string;
  symbol: string;
  decimals: number;
  coin_gecko_id: string | null;
  img_url: string | null;
  token_spec: "native" | "factory" | "erc20" | "ibc" | "cw20";
  data_source: string;
  metadata: Record<string, unknown>;
}

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

  return (await response.json()) as AssetMeta[];
}
