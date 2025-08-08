export interface EnvType {
  KEPLR_EWALLET_SDK_ENDPOINT: string;
}

export const Envs = {
  KEPLR_EWALLET_SDK_ENDPOINT: process.env.KEPLR_EWALLET_SDK_ENDPOINT!,
};
