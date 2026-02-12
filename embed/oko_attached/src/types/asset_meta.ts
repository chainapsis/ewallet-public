type DefaultMetadata = Record<string, never>;

export interface ERC20Metadata {
  name: string;
}

export interface SPLMetadata {
  name: string;
}

export interface IBCMetadata {
  origin_chain_identifier: string;
  base_denom: string;
}

interface AssetMetaBase {
  meta_id: string;
  chain_identifier: string;
  denom: string;
  symbol: string;
  decimals: number;
  coin_gecko_id: string | null;
  img_url: string | null;
  data_source: AssetMetaDataSource;
}

export interface NativeAssetMeta {
  token_spec: "native";
  metadata: DefaultMetadata;
  base: AssetMetaBase;
}

export interface FactoryAssetMeta {
  token_spec: "factory";
  metadata: DefaultMetadata;
  base: AssetMetaBase;
}

export interface ERC20AssetMeta {
  token_spec: "erc20";
  metadata: ERC20Metadata;
  base: AssetMetaBase;
}

export interface IBCAssetMeta {
  token_spec: "ibc";
  metadata: IBCMetadata;
  base: AssetMetaBase;
}

export interface CW20AssetMeta {
  token_spec: "cw20";
  metadata: ERC20Metadata;
  base: AssetMetaBase;
}

export interface SPLAssetMeta {
  token_spec: "spl";
  metadata: SPLMetadata;
  base: AssetMetaBase;
}

// mongodb table name
export type AssetMetaDataSource =
  | "new-coingecko-token-info" // erc20
  | "chain-registry/token-factory" // factory
  | "chain-registry/denom-trace" // ibc
  | "chain-registry" // native
  | "contract-registry" // cw20
  | "skip"; // unknown erc20

export type AssetMeta =
  | NativeAssetMeta
  | FactoryAssetMeta
  | ERC20AssetMeta
  | IBCAssetMeta
  | CW20AssetMeta
  | SPLAssetMeta;

export interface AssetMetaInput {
  chain_identifier: string;
  minimal_denom: string;
}
export interface AssetMetaParams {
  assets: AssetMetaInput[];
}
