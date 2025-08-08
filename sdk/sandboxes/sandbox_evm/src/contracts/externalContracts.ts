import { GenericContractsDeclaration } from "@keplr-ewallet-sandbox-evm/utils/scaffold-eth/contract";
import { USDCAbi } from "./abis/USDC";

/**
 * @example
 * const externalContracts = {
 *   1: {
 *     DAI: {
 *       address: "0x...",
 *       abi: [...],
 *     },
 *   },
 * } as const;
 */
const externalContracts = {
  1: {
    USDC: {
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      abi: USDCAbi,
    },
  },
  11155111: {
    USDC: {
      address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      abi: USDCAbi,
    },
  },
} as const;

export default externalContracts satisfies GenericContractsDeclaration;
