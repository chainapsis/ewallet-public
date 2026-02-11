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

export type NativeAssetMeta = AssetMetaBase & {
  token_spec: "native";
  metadata: DefaultMetadata;
};

export type FactoryAssetMeta = AssetMetaBase & {
  token_spec: "factory";
  metadata: DefaultMetadata;
};

export type ERC20AssetMeta = AssetMetaBase & {
  token_spec: "erc20";
  metadata: ERC20Metadata;
};

export type IBCAssetMeta = AssetMetaBase & {
  token_spec: "ibc";
  metadata: IBCMetadata;
};

export type CW20AssetMeta = AssetMetaBase & {
  token_spec: "cw20";
  metadata: ERC20Metadata;
};

export type SPLAssetMeta = AssetMetaBase & {
  token_spec: "spl";
  metadata: SPLMetadata;
};

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
