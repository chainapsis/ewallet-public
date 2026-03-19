declare module "pako" {
  const pako: {
    deflateRaw(input: string | Uint8Array): Uint8Array;
    inflateRaw(input: Uint8Array): Uint8Array;
  };

  export default pako;
}
