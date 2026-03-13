import { type ReactNode, useCallback } from "react";

import type { CommonInputProps } from "@oko-wallet-sandbox-evm/components/scaffold-eth";

type TextAreaInputProps = CommonInputProps<string> & {
  error?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  rows?: number;
  readOnly?: boolean;
};

export const TextAreaInput = ({
  name,
  value,
  onChange,
  placeholder,
  disabled,
  error,
  prefix,
  suffix,
  rows = 4,
  readOnly = false,
}: TextAreaInputProps) => {
  let modifier = "";
  if (error) {
    modifier = "border-error";
  } else if (disabled) {
    modifier = "border-disabled bg-base-300";
  }

  const handleChange = useCallback<
    React.ChangeEventHandler<HTMLTextAreaElement>
  >(
    (e) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  return (
    <div
      className={`flex border-2 border-base-300 bg-base-200 rounded-2xl text-accent ${modifier}`}
    >
      {prefix}
      <textarea
        className="textarea textarea-ghost focus-within:border-transparent focus:outline-hidden focus:bg-transparent min-h-[2.2rem] px-4 py-3 border w-full font-medium placeholder:text-accent/70 text-base-content/70 focus:text-base-content/70"
        placeholder={placeholder}
        name={name}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        rows={rows}
        readOnly={readOnly}
      />
      {suffix}
    </div>
  );
};
