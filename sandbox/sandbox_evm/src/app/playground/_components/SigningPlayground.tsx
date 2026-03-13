"use client";

import { Eip712SignWidget } from "./EIP712SignWidget";
import { ERC20TransferWidget } from "./ERC20TransferWidget";
import { NativeTransferWidget } from "./NativeTransferWidget";
import { PermitSignWidget } from "./PermitSignWidget";
import { PersonalSignWidget } from "./PersonalSignWidget";
import { SignatureVerificationWidget } from "./SignatureVerificationWidget";
import { SiweSignWidget } from "./SiweSignWidget";

export function SigningPlayground() {
  return (
    <div className="p-10">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Signing Playground</h1>
          <p className="text-base-content/70 mt-2">
            Try personal_sign, EIP-712 Permit, Sign-In with Ethereum, native
            asset transfers, then verify signatures.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <PersonalSignWidget />
          <Eip712SignWidget />
          <PermitSignWidget />
          <SiweSignWidget />
          <NativeTransferWidget />
          <ERC20TransferWidget />
        </div>

        <SignatureVerificationWidget />
      </div>
    </div>
  );
}
