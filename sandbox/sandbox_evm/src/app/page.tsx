"use client";

import { BugAntIcon, PlayIcon } from "@heroicons/react/24/outline";
import type { NextPage } from "next";
import Link from "next/link";
import { useAccount } from "wagmi";

import { Address } from "@oko-wallet-sandbox-evm/components/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();

  return (
    <div className="flex items-center flex-col grow pt-10">
      <div className="px-5">
        <h1 className="text-center">
          <span className="block text-2xl mb-2">Welcome to</span>
          <span className="block text-4xl font-bold">EVM Sandbox</span>
        </h1>
        <div className="flex justify-center items-center space-x-2 flex-col">
          <p className="my-2 font-medium">Connected Address:</p>
          <Address address={connectedAddress} />
        </div>
      </div>

      <div className="grow bg-base-300 w-full mt-16 px-8 py-12">
        <div className="flex justify-center items-center gap-12 flex-col md:flex-row">
          <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
            <BugAntIcon className="h-8 w-8 fill-secondary" />
            <p>
              Tinker with your smart contract using the{" "}
              <Link href="/debug" passHref className="link">
                Debug Contracts
              </Link>{" "}
              tab.
            </p>
          </div>

          <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
            <PlayIcon className="h-8 w-8 fill-secondary" />
            <p>
              Test signing operations in the{" "}
              <Link href="/playground" passHref className="link">
                Signing Playground
              </Link>{" "}
              tab.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
