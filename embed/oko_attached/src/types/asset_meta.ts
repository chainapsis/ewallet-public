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

// mongodb table name
export type AssetMetaDataSource =
  | "new-coingecko-token-info" // erc20
  | "chain-registry/token-factory" // factory
  | "chain-registry/denom-trace" // ibc
  | "chain-registry" // native
  | "contract-registry" // cw20
  | "skip"; // unknown erc20

interface AssetMetaFields {
  meta_id: string;
  chain_identifier: string;
  denom: string;
  symbol: string;
  decimals: number;
  coin_gecko_id: string | null;
  img_url: string | null;
  data_source: AssetMetaDataSource;
}

export interface NativeAssetMeta extends AssetMetaFields {
  token_spec: "native";
  metadata: DefaultMetadata;
}

export interface FactoryAssetMeta extends AssetMetaFields {
  token_spec: "factory";
  metadata: DefaultMetadata;
}

export interface ERC20AssetMeta extends AssetMetaFields {
  token_spec: "erc20";
  metadata: ERC20Metadata;
}

export interface IBCAssetMeta extends AssetMetaFields {
  token_spec: "ibc";
  metadata: IBCMetadata;
}

export interface CW20AssetMeta extends AssetMetaFields {
  token_spec: "cw20";
  metadata: ERC20Metadata;
}

export interface SPLAssetMeta extends AssetMetaFields {
  token_spec: "spl";
  metadata: SPLMetadata;
}

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
