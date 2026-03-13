import { useState } from "react";
import {
  type Hex,
  isAddress,
  pad,
  type TypedDataDefinition,
  type TypedDataDomain,
  toHex,
  type WalletClient,
  zeroAddress,
} from "viem";
import { useReadContract, useWalletClient } from "wagmi";

import { PermitParamsAbi } from "@oko-wallet-sandbox-evm/contracts/abis/Permit";

export function usePermit({
  contractAddress,
  chainId,
  walletClient,
  ownerAddress,
  spenderAddress,
  permitVersion,
}: UsePermitProps) {
  const [signature, setSignature] = useState<Hex | undefined>();
  const [error, setError] = useState<Error>();
  const [signedTypedData, setSignedTypedData] = useState<string | undefined>();

  const { data: defaultWalletClient } = useWalletClient();
  const walletClientToUse = walletClient ?? defaultWalletClient;
  const ownerToUse =
    ownerAddress ?? walletClientToUse?.account?.address ?? zeroAddress;

  const hasValidContract =
    chainId !== undefined &&
    contractAddress !== undefined &&
    typeof contractAddress === "string" &&
    isAddress(contractAddress);

  const hasWalletOwner =
    !!walletClientToUse?.account?.address &&
    isAddress(walletClientToUse!.account!.address as Hex);

  const { data: nonce } = useReadContract({
    chainId,
    address: contractAddress,
    abi: PermitParamsAbi,
    functionName: "nonces",
    args: [ownerToUse],
    query: { enabled: hasValidContract && hasWalletOwner },
  });
  const { data: name } = useReadContract({
    chainId,
    address: contractAddress,
    abi: PermitParamsAbi,
    functionName: "name",
    query: { enabled: hasValidContract },
  });
  const { data: versionFromContract } = useReadContract({
    chainId,
    address: contractAddress,
    abi: PermitParamsAbi,
    functionName: "version",
    query: { enabled: hasValidContract },
  });

  const validatedVersionFromContract = [1, 2, "1", "2"].includes(
    versionFromContract ?? "",
  )
    ? versionFromContract
    : null;

  const version = permitVersion ?? validatedVersionFromContract ?? "1";

  const reset = () => {
    setSignature(undefined);
    setSignedTypedData(undefined);
    setError(undefined);
  };

  const ready =
    walletClientToUse !== null &&
    walletClientToUse !== undefined &&
    spenderAddress !== undefined &&
    chainId !== undefined &&
    hasValidContract &&
    name !== undefined &&
    nonce !== undefined;

  return {
    signPermitDai: ready
      ? async (
          props: PartialBy<
            SignPermitProps,
            | "chainId"
            | "ownerAddress"
            | "contractAddress"
            | "spenderAddress"
            | "nonce"
            | "erc20Name"
            | "permitVersion"
          > & {
            walletClient?: WalletClient;
          },
        ) =>
          signPermitDai(props.walletClient ?? walletClientToUse, {
            chainId,
            ownerAddress:
              ownerAddress ??
              props.walletClient?.account?.address ??
              walletClientToUse.account?.address ??
              zeroAddress,
            contractAddress: contractAddress,
            spenderAddress: spenderAddress ?? zeroAddress,
            erc20Name: name,
            permitVersion: version,
            nonce,
            ...props,
          })
            .then((signature) => {
              setSignature(signature);
              return signature;
            })
            .catch((error) => {
              setError(error);
              throw error;
            })
      : undefined,
    signPermit: ready
      ? async (
          props: PartialBy<
            Eip2612Props,
            | "chainId"
            | "ownerAddress"
            | "contractAddress"
            | "spenderAddress"
            | "nonce"
            | "erc20Name"
            | "permitVersion"
          > & {
            walletClient?: WalletClient;
          },
        ) => {
          try {
            const { signature, typedData } = await signPermit(
              props.walletClient ?? walletClientToUse,
              {
                chainId,
                ownerAddress:
                  ownerAddress ??
                  props.walletClient?.account?.address ??
                  walletClientToUse?.account?.address ??
                  zeroAddress,
                contractAddress: contractAddress,
                spenderAddress: spenderAddress ?? zeroAddress,
                erc20Name: name,
                nonce,
                permitVersion: version,
                ...props,
              },
            );
            setSignature(signature);
            setSignedTypedData(
              JSON.stringify(
                typedData,
                (_, value) => {
                  if (typeof value === "bigint") {
                    return value.toString();
                  }
                  return value;
                },
                2,
              ),
            );
            return signature;
          } catch (error) {
            setError(error as Error);
            throw error;
          }
        }
      : undefined,
    signature,
    signedTypedData,
    name,
    version,
    nonce,
    error,
    reset,
  };
}

export type UsePermitProps = Partial<SignPermitProps> & {
  walletClient?: WalletClient | null;
};

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type PermitSignature = {
  r: Hex;
  s: Hex;
  v: number;
};

export type SignPermitProps = {
  /** Address of the token to approve */
  contractAddress: Hex;
  /** Name of the token to approve.
   * Corresponds to the `name` method on the ERC-20 contract. Please note this must match exactly byte-for-byte */
  erc20Name: string;
  /** Owner of the tokens. Usually the currently connected address. */
  ownerAddress: Hex;
  /** Address to grant allowance to */
  spenderAddress: Hex;
  /** Expiration of this approval, in SECONDS */
  deadline: bigint;
  /** Numerical chainId of the token contract */
  chainId: number;
  /** Defaults to 1. Some tokens need a different version, check the [PERMIT INFORMATION](https://github.com/vacekj/wagmi-permit/blob/main/PERMIT.md) for more information */
  permitVersion?: string;
  /** Permit nonce for the specific address and token contract. You can get the nonce from the `nonces` method on the token contract. */
  nonce: bigint;
};

export type Eip2612Props = SignPermitProps & {
  /** Amount to approve */
  value: bigint;
};

/**
 * Signs a permit for a given ERC-2612 ERC20 token using the specified parameters.
 *
 * @param {WalletClient} walletClient - Wallet client to invoke for signing the permit message
 * @param {SignPermitProps} props - The properties required to sign the permit.
 * @param {string} props.contractAddress - The address of the ERC20 token contract.
 * @param {string} props.erc20Name - The name of the ERC20 token.
 * @param {number} props.value - The amount of the ERC20 to approve.
 * @param {string} props.ownerAddress - The address of the token holder.
 * @param {string} props.spenderAddress - The address of the token spender.
 * @param {number} props.deadline - The permit expiration timestamp in seconds.
 * @param {number} props.nonce - The nonce of the address on the specified ERC20.
 * @param {number} props.chainId - The chain ID for which the permit will be valid.
 * @param {number} props.permitVersion - The version of the permit (optional, defaults to "1").
 */
export const signPermit = async (
  walletClient: WalletClient,
  {
    contractAddress,
    erc20Name,
    ownerAddress,
    spenderAddress,
    value,
    deadline,
    nonce,
    chainId,
    permitVersion,
  }: Eip2612Props,
): Promise<{ signature: Hex; typedData: TypedDataDefinition }> => {
  const types = {
    Permit: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  } as const;

  const domainData = {
    name: erc20Name,
    /** We assume 1 if permit version is not specified */
    version: permitVersion ?? "1",
    chainId: chainId,
    verifyingContract: contractAddress,
  } as const;

  const message = {
    owner: ownerAddress,
    spender: spenderAddress,
    value,
    nonce,
    deadline,
  } as const;

  const signature = await walletClient.signTypedData({
    account: ownerAddress,
    message,
    domain: domainData,
    primaryType: "Permit",
    types,
  });

  return {
    signature,
    typedData: {
      domain: domainData,
      types,
      message,
      primaryType: "Permit",
    },
  };
};

export const signPermitDai =
  /**
   * Signs a permit for a given ERC20 token using the specified parameters.
   *
   * @param {WalletClient} walletClient - 	Wallet client to invoke for signing the permit message
   * @param {SignPermitProps} props - The properties required to sign the permit.
   * @param {string} props.contractAddress - The address of the ERC20 token contract.
   * @param {string} props.erc20Name - The name of the ERC20 token.
   * @param {string} props.ownerAddress - The address of the token holder.
   * @param {string} props.spenderAddress - The address of the token spender.
   * @param {number} props.deadline - The permit expiration timestamp in seconds.
   * @param {number} props.nonce - The nonce of the address on the specified ERC20.
   * @param {number} props.chainId - The chain ID for which the permit will be valid.
   * @param {number} props.permitVersion - The version of the permit (optional, defaults to "1").
   */
  async (
    walletClient: WalletClient,
    {
      contractAddress,
      erc20Name,
      ownerAddress,
      spenderAddress,
      deadline,
      nonce,
      chainId,
      permitVersion,
    }: SignPermitProps,
  ): Promise<Hex> => {
    const types = {
      Permit: [
        { name: "holder", type: "address" },
        { name: "spender", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "expiry", type: "uint256" },
        { name: "allowed", type: "bool" },
      ],
    };

    let domainData: TypedDataDomain = {
      name: erc20Name,
      /** There are no known Dai deployments with Dai permit and version other than or unspecified */
      version: permitVersion ?? "1",
      chainId: chainId,
      verifyingContract: contractAddress,
    };
    /** USDC on Polygon is a special case */
    if (chainId === 137 && erc20Name === "USD Coin (PoS)") {
      domainData = {
        name: erc20Name,
        version: permitVersion ?? "1",
        verifyingContract: contractAddress,
        salt: pad(toHex(137), { size: 32 }),
      };
    }

    const message = {
      holder: ownerAddress,
      spender: spenderAddress,
      nonce,
      expiry: deadline,
      /** true == infinite allowance, false == 0 allowance*/
      allowed: true,
    };

    return await walletClient.signTypedData({
      account: ownerAddress,
      domain: domainData,
      primaryType: "Permit",
      types,
      message,
    });
  };
