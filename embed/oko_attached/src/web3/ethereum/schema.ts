// dynamic-erc2612.ts

import { getAddress, isAddress } from "viem";
import { type ZodError, z } from "zod";

export type UintOutput = "bigint" | "string";
export interface BuildOptions {
  uintOutput?: UintOutput;
  coerceBooleans?: boolean;
}

function addressSchema() {
  return z
    .string()
    .refine((s) => typeof s === "string" && isAddress(s), {
      message: "invalid address",
    })
    .transform((s) => getAddress(s)); // checksum
}

function uintSchema(output: UintOutput = "bigint") {
  const base = z.union([z.string(), z.number(), z.bigint()]);

  if (output === "string") {
    return base.transform((v) => {
      if (typeof v === "bigint") {
        return v.toString();
      }
      if (typeof v === "number") {
        return BigInt(v).toString();
      }
      return BigInt(v).toString(); // handles "0x..." or decimals
    });
  }

  return base.transform((v) => {
    if (typeof v === "bigint") {
      return v;
    }
    if (typeof v === "number") {
      return BigInt(v);
    }
    return BigInt(v);
  });
}

// EIP712 Domain:
// name(string), version?(string), chainId(uint256), verifyingContract(address)
export function getEip712DomainSchema(opts?: BuildOptions) {
  return z
    .object({
      name: z.string(),
      version: z.string().optional(),
      chainId: uintSchema(opts?.uintOutput),
      verifyingContract: addressSchema(),
    })
    .strict();
}

export type EIP712Domain = z.infer<ReturnType<typeof getEip712DomainSchema>>;

export function validateEip712Domain(
  payload: unknown,
  opts?: BuildOptions,
): { ok: true; data: EIP712Domain } | { ok: false; error: ZodError } {
  const schema = getEip712DomainSchema(opts);
  try {
    const parsed = schema.parse(payload);
    return { ok: true, data: parsed };
  } catch (e) {
    return { ok: false, error: e as ZodError };
  }
}

// Erc2612 Permit:
// owner(address), spender(address), value(uint256), nonce(uint256), deadline(uint256)
export const getErc2612PermitSchema = (opts?: BuildOptions) =>
  z
    .object({
      owner: addressSchema(),
      spender: addressSchema(),
      value: uintSchema(opts?.uintOutput),
      nonce: uintSchema(opts?.uintOutput),
      deadline: uintSchema(opts?.uintOutput),
    })
    .strict();

export type Erc2612Permit = z.infer<ReturnType<typeof getErc2612PermitSchema>>;

export function validateErc2612Permit(
  payload: unknown,
  opts?: BuildOptions,
): { ok: true; data: Erc2612Permit } | { ok: false; error: ZodError } {
  const schema = getErc2612PermitSchema(opts);
  try {
    const parsed = schema.parse(payload);
    return { ok: true, data: parsed };
  } catch (e) {
    return { ok: false, error: e as ZodError };
  }
}

// DAI Permit:
// holder(address), spender(address), nonce(uint256), expiry(uint256), allowed(bool)
export function getDAIPermitSchema(opts?: BuildOptions) {
  return z
    .object({
      holder: addressSchema(),
      spender: addressSchema(),
      nonce: uintSchema(opts?.uintOutput),
      expiry: uintSchema(opts?.uintOutput),
      allowed: z.boolean(),
    })
    .strict();
}

export type DAIPermit = z.infer<ReturnType<typeof getDAIPermitSchema>>;

export function validateDAIPermit(
  payload: unknown,
  opts?: BuildOptions,
): { ok: true; data: DAIPermit } | { ok: false; error: ZodError } {
  const schema = getDAIPermitSchema(opts);
  try {
    const parsed = schema.parse(payload);
    return { ok: true, data: parsed };
  } catch (e) {
    return { ok: false, error: e as ZodError };
  }
}

// PermitDetails:
// token(address), amount(uint160), expiration(uint48), nonce(uint48)
export function getPermitDetailsSchema(opts?: BuildOptions) {
  return z
    .object({
      token: addressSchema(),
      amount: uintSchema(opts?.uintOutput),
      expiration: uintSchema(opts?.uintOutput),
      nonce: uintSchema(opts?.uintOutput),
    })
    .strict();
}

export type PermitDetails = z.infer<ReturnType<typeof getPermitDetailsSchema>>;

// Uniswap PermitSingle:
// details(PermitDetails), spender(address), sigDeadline(uint256)
export function getUniswapPermitSingleSchema(opts?: BuildOptions) {
  return z
    .object({
      details: getPermitDetailsSchema(),
      spender: addressSchema(),
      sigDeadline: uintSchema(opts?.uintOutput),
    })
    .strict();
}

export type UniswapPermitSingle = z.infer<
  ReturnType<typeof getUniswapPermitSingleSchema>
>;

export function validateUniswapPermitSingle(
  payload: unknown,
  opts?: BuildOptions,
): { ok: true; data: UniswapPermitSingle } | { ok: false; error: ZodError } {
  const schema = getUniswapPermitSingleSchema(opts);
  try {
    const parsed = schema.parse(payload);
    return { ok: true, data: parsed };
  } catch (e) {
    return { ok: false, error: e as ZodError };
  }
}
