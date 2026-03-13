import type {
  ChainInfoForAttachedModal,
  EthereumEip712SignPayload,
} from "@oko-wallet/oko-sdk-core";
import { parseTypedDataDefinition } from "@oko-wallet/oko-sdk-eth";
import type { Chain, TypedDataDefinition } from "viem";

import type {
  DAIPermitAction,
  EIP712Action,
  ERC2612PermitAction,
  UniswapPermitSingleAction,
} from "../actions/types";
import { useSupportedEthChain } from "@oko-wallet-attached/web3/ethereum/hooks/use_supported_eth_chain";
import {
  type EIP712Domain,
  validateDAIPermit,
  validateEip712Domain,
  validateErc2612Permit,
  validateUniswapPermitSingle,
} from "@oko-wallet-attached/web3/ethereum/schema";
import { findCurrencyByErc20Address } from "@oko-wallet-attached/web3/ethereum/utils";

export type UseEIP712ActionResult =
  | {
      action: null;
      evmChain: null;
    }
  | {
      action: EIP712Action | null;
      evmChain: Chain;
    };

export function useEIP712Action(
  payload: EthereumEip712SignPayload,
): UseEIP712ActionResult {
  const { isSupportedChain, evmChain } = useSupportedEthChain({
    chainInfoForModal: payload.chain_info,
  });

  if (!isSupportedChain || !evmChain) {
    return {
      action: null,
      evmChain: null,
    };
  }

  const action = parseAction(payload);

  return {
    action,
    evmChain,
  };
}

function parseEIP712Domain(
  domain: Record<string, unknown>,
): EIP712Domain | null {
  const parsed = validateEip712Domain(domain);

  if (!parsed.ok) {
    return null;
  }

  return parsed.data;
}

function parseERC2612Permit(
  data: TypedDataDefinition,
  chainInfo: ChainInfoForAttachedModal,
): ERC2612PermitAction | null {
  const permitType = data.types?.Permit;
  if (!Array.isArray(permitType)) {
    return null;
  }

  const message = data.message;
  if (!message || typeof message !== "object") {
    return null;
  }

  const parsed = validateErc2612Permit(message);
  if (!parsed.ok) {
    return null;
  }

  if (!data.domain || typeof data.domain !== "object") {
    return null;
  }

  const domain = parseEIP712Domain(data.domain);
  if (!domain) {
    return null;
  }

  const contractAddress = domain.verifyingContract;

  return {
    kind: "erc2612.permit",
    owner: parsed.data.owner,
    spender: parsed.data.spender,
    amount: parsed.data.value,
    deadline: parsed.data.deadline,
    nonce: parsed.data.nonce,
    domain: domain,
    typedData: data,
    tokenLogoURI: findCurrencyByErc20Address(chainInfo, contractAddress)
      ?.coinImageUrl,
  };
}

function parseDAIPermit(
  data: TypedDataDefinition,
  chainInfo: ChainInfoForAttachedModal,
): DAIPermitAction | null {
  const permitType = data.types?.Permit;
  if (!Array.isArray(permitType)) {
    return null;
  }

  const message = data.message;
  if (!message || typeof message !== "object") {
    return null;
  }

  const parsed = validateDAIPermit(message);
  if (!parsed.ok) {
    return null;
  }

  if (!data.domain || typeof data.domain !== "object") {
    return null;
  }

  const domain = parseEIP712Domain(data.domain);
  if (!domain) {
    return null;
  }

  const contractAddress = domain.verifyingContract;

  return {
    kind: "dai.permit",
    holder: parsed.data.holder,
    spender: parsed.data.spender,
    nonce: parsed.data.nonce,
    expiry: parsed.data.expiry,
    allowed: parsed.data.allowed,
    domain: domain,
    typedData: data,
    tokenLogoURI: findCurrencyByErc20Address(chainInfo, contractAddress)
      ?.coinImageUrl,
  };
}

function parseUniswapPermitSingle(
  data: TypedDataDefinition,
  chainInfo: ChainInfoForAttachedModal,
): UniswapPermitSingleAction | null {
  const permitType = data.types?.PermitSingle;
  if (!Array.isArray(permitType)) {
    return null;
  }

  const message = data.message;
  if (!message || typeof message !== "object") {
    return null;
  }

  const parsed = validateUniswapPermitSingle(message);
  if (!parsed.ok) {
    return null;
  }

  if (!data.domain || typeof data.domain !== "object") {
    return null;
  }

  const domain = parseEIP712Domain(data.domain);
  if (!domain) {
    return null;
  }

  const contractAddress = parsed.data.details.token;

  return {
    kind: "uniswap.permitSingle",
    details: parsed.data.details,
    spender: parsed.data.spender,
    sigDeadline: parsed.data.sigDeadline,
    domain: domain,
    typedData: data,
    tokenLogoURI: findCurrencyByErc20Address(chainInfo, contractAddress)
      ?.coinImageUrl,
  };
}

function parseAction(payload: EthereumEip712SignPayload): EIP712Action | null {
  const typedData = parseTypedDataDefinition(
    payload.data.serialized_typed_data,
  );

  switch (typedData.primaryType) {
    case "Permit": {
      const erc2612Action = parseERC2612Permit(typedData, payload.chain_info);
      if (erc2612Action) {
        return erc2612Action;
      }

      const daiAction = parseDAIPermit(typedData, payload.chain_info);
      if (daiAction) {
        return daiAction;
      }
      break;
    }

    case "PermitSingle": {
      const permitSingleAction = parseUniswapPermitSingle(
        typedData,
        payload.chain_info,
      );
      if (permitSingleAction) {
        return permitSingleAction;
      }
      break;
    }

    // Add more cases here for future implementations
    default:
      break;
  }

  // fallback to unknown action
  return {
    kind: "unknown",
    typedData,
  };
}
