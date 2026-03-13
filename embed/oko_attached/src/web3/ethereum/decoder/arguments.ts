import { type Address, type Hex, isAddress } from "viem";

type ArgType =
  | "address"
  | "uint256"
  | "bool"
  | "bytes"
  | "uint256[]"
  | "uint8"
  | "bytes32";

const expectedArgTypes: Record<string, Array<Array<ArgType>>> = {
  transfer: [["address", "uint256"]],
  transferFrom: [["address", "address", "uint256"]],
  approve: [["address", "uint256"]],
  permit: [
    ["address", "address", "uint256", "uint256", "bytes"],
    ["address", "address", "uint256", "uint256", "uint8", "bytes32", "bytes32"],
    [
      "address",
      "address",
      "uint256",
      "uint256",
      "bool",
      "uint8",
      "bytes32",
      "bytes32",
    ],
  ],
  safeTransferFrom: [
    ["address", "address", "uint256"],
    ["address", "address", "uint256", "bytes"],
    ["address", "address", "uint256", "uint256", "bytes"],
  ],
  setApprovalForAll: [["address", "bool"]],
  safeBatchTransferFrom: [
    ["address", "address", "uint256[]", "uint256[]", "bytes"],
  ],
};

function isTypeMatch(value: unknown, type: ArgType): boolean {
  switch (type) {
    case "address":
      return typeof value === "string" && isAddress(value);
    case "uint256":
      return typeof value === "bigint";
    case "uint8":
      return typeof value === "number" || typeof value === "bigint";
    case "bool":
      return typeof value === "boolean";
    case "uint256[]":
      return Array.isArray(value) && value.every((v) => typeof v === "bigint");
    case "bytes":
    case "bytes32":
      return typeof value === "string" && value.startsWith("0x");
    default:
      // NOTE: extend as needed in the future
      return false;
  }
}

export function validateArgsForFunction(
  fnName: string,
  args: unknown[],
): boolean {
  const signatures = expectedArgTypes[fnName];
  if (!signatures) {
    return false;
  }

  return signatures.some((expected) => {
    return (
      expected.length === args.length &&
      expected.every((type, idx) => isTypeMatch(args[idx], type))
    );
  });
}

type ArgTypeToValue<T extends ArgType> = T extends "address"
  ? Address
  : T extends "uint256"
    ? bigint
    : T extends "uint8"
      ? number | bigint
      : T extends "bool"
        ? boolean
        : T extends "uint256[]"
          ? bigint[]
          : T extends "bytes" | "bytes32"
            ? Hex
            : never;

export function extractValuesFromArgs<T extends ArgType>(
  args: readonly unknown[],
  type: T,
): ArgTypeToValue<T>[] {
  return args
    .map((value) => {
      if (isTypeMatch(value, type)) {
        return value as ArgTypeToValue<T>;
      }
      return null;
    })
    .filter((value): value is ArgTypeToValue<T> => value !== null);
}
