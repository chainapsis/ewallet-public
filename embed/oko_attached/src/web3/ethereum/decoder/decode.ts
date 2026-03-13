import type { Abi, DecodeFunctionDataReturnType, Hex } from "viem";
import { decodeFunctionData, parseAbi } from "viem";

import {
  ERC20_WRITE_FUNCTIONS_ABI,
  ERC721_WRITE_FUNCTIONS_ABI,
  ERC1155_WRITE_FUNCTIONS_ABI,
  ZERO_INTERFACE_ID,
} from "./constants";
import {
  fetchFunctionFrom4Bytes,
  fetchFunctionFromOpenchain,
} from "./selector";

export async function decodeCalldataWithSelector({
  calldata,
}: {
  calldata: Hex;
}): Promise<DecodeFunctionDataReturnType | null> {
  const selector = calldata.slice(0, 10) as Hex;
  if (selector === ZERO_INTERFACE_ID) {
    throw new Error(
      `Skipping to decode calldata with selector ${ZERO_INTERFACE_ID}`,
    );
  }

  try {
    const fnInterface = await fetchFunctionInterface({ selector });
    if (!fnInterface) {
      throw new Error("Could not find function interface");
    }
    const decodedTransactions = decodeCalldataWithAllPossibilities({
      functionSignatures: [fnInterface],
      calldata,
    });

    if (decodedTransactions.length === 0) {
      throw new Error("Failed to decode calldata with function signature");
    }

    return decodedTransactions[0];
  } catch {
    return null;
  }
}

export async function fetchFunctionInterface({
  selector,
}: {
  selector: Hex;
}): Promise<string | null> {
  const openChainData = await fetchFunctionFromOpenchain({ selector });

  let result: string | null = null;
  // giving priority to openchain data because it filters spam like: `mintEfficientN2M_001Z5BWH` for 0x00000000
  if (openChainData) {
    result = openChainData[0].name;
  } else {
    const fourByteData = await fetchFunctionFrom4Bytes({ selector });
    if (fourByteData) {
      result = fourByteData[0].text_signature;
    }
  }

  return result;
}

function decodeCalldataWithAllPossibilities({
  functionSignatures,
  calldata,
}: {
  functionSignatures: string[];
  calldata: Hex;
}): DecodeFunctionDataReturnType[] {
  const results: DecodeFunctionDataReturnType[] = [];
  for (const signature of functionSignatures) {
    try {
      const parsedTransaction = decodeCalldataWithABI({
        abi: parseAbi([`function ${signature}` as any]),
        calldata,
      });
      if (parsedTransaction) {
        results.push(parsedTransaction);
      }
    } catch (_error) {
      console.error(
        `Failed to decode calldata with signature ${signature}, skipping`,
      );
    }
  }
  return results;
}

export function decodeCalldataWithABI({
  abi,
  calldata,
}: {
  abi: Abi;
  calldata: Hex;
}): DecodeFunctionDataReturnType | null {
  return decodeFunctionData({ abi, data: calldata });
}

export async function decodeCalldata({
  calldata,
  abi,
}: {
  calldata: Hex;
  abi?: Abi;
}): Promise<DecodeFunctionDataReturnType | null> {
  let decoded: DecodeFunctionDataReturnType | null;
  if (abi) {
    decoded = decodeCalldataWithABI({ abi, calldata });
  } else {
    // Try local common ABIs first (fast path), then fall back to remote selector lookup
    try {
      decoded = decodeCalldataWithABI({
        abi: ERC20_WRITE_FUNCTIONS_ABI,
        calldata,
      });
    } catch {
      try {
        decoded = decodeCalldataWithABI({
          abi: ERC721_WRITE_FUNCTIONS_ABI,
          calldata,
        });
      } catch {
        try {
          decoded = decodeCalldataWithABI({
            abi: ERC1155_WRITE_FUNCTIONS_ABI,
            calldata,
          });
        } catch {
          decoded = null;
        }
      }
    }

    if (!decoded) {
      try {
        decoded = await decodeCalldataWithSelector({ calldata });
      } catch {
        decoded = null;
      }
    }
  }

  if (decoded) {
    return decoded;
  } else {
    return null;
  }
}
