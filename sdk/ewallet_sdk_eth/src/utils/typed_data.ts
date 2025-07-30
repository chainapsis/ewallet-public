import type { TypedDataDefinition } from "viem";

/**
 * Parse typed data from a string, and convert string to bigint
 * @param text - The string to parse
 * @param reviver - A function to transform the parsed value
 * @returns The parsed typed data
 */
export const parseTypedData = <T>(
  text: string,
  reviver?: (this: any, key: string, value: any) => any,
): T => {
  return JSON.parse(text, (key, val) => {
    // First apply user-provided reviver, if any
    const revived =
      typeof reviver === "function" ? reviver.call(this, key, val) : val;
    // Then detect our explicit bigint tag on the revived value
    if (
      revived !== null &&
      typeof revived === "object" &&
      (revived as any).__type === "bigint" &&
      typeof (revived as any).value === "string"
    ) {
      return BigInt((revived as any).value);
    }
    // Otherwise return the revived or original value
    return revived;
  });
};

/**
 * Parse typed data from a string and explicitly convert to TypedDataDefinition
 * This provides better type safety for EIP-712 typed data structures
 * @param text - The string representation of typed data
 * @param reviver - Optional function to transform parsed values
 * @returns The parsed typed data as TypedDataDefinition
 */
export const parseTypedDataDefinition = (
  text: string,
  reviver?: (this: any, key: string, value: any) => any,
): TypedDataDefinition => {
  return parseTypedData<TypedDataDefinition>(text, reviver);
};
