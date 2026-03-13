import { useCallback } from "react";
import { bytesToString, isHex, toBytes, toHex } from "viem";

import {
  type CommonInputProps,
  InputBase,
} from "@oko-wallet-sandbox-evm/components/scaffold-eth";

export const BytesInput = ({
  value,
  onChange,
  name,
  placeholder,
  disabled,
  disableConvertToHex,
}: CommonInputProps & {
  disableConvertToHex?: boolean;
}) => {
  const convertStringToBytes = useCallback(() => {
    onChange(
      isHex(value) ? bytesToString(toBytes(value)) : toHex(toBytes(value)),
    );
  }, [onChange, value]);

  return (
    <InputBase
      name={name}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      disabled={disabled}
      suffix={
        !disableConvertToHex ? (
          <button
            className="self-center cursor-pointer text-xl font-semibold px-4 text-accent"
            onClick={convertStringToBytes}
            type="button"
          >
            #
          </button>
        ) : null
      }
    />
  );
};
