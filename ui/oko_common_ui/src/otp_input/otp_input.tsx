import {
  type ClipboardEvent,
  type FC,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import styles from "./otp_input.module.scss";

interface OtpInputProps {
  length: number;
  value: string[];
  onChange: (value: string[]) => void;
  onComplete?: (value: string[]) => void;
  disabled?: boolean;
  isError?: boolean;
}

function isSingleDigit(value: string): boolean {
  return /^\d$/.test(value);
}

function isComplete(digits: string[], length: number): boolean {
  return (
    digits.length === length &&
    digits.every((digit) => digit !== "" && isSingleDigit(digit))
  );
}

export const OtpInput: FC<OtpInputProps> = ({
  length,
  value,
  onChange,
  onComplete,
  disabled = false,
  isError = false,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const digits = value;

  const getActiveIndex = () => {
    const idx = digits.findIndex((d) => !d);
    return idx === -1 ? length - 1 : idx;
  };

  const prevDisabledRef = useRef(disabled);

  useEffect(() => {
    if (prevDisabledRef.current && !disabled && isComplete(digits, length)) {
      inputRefs.current[length - 1]?.focus();
    }
    prevDisabledRef.current = disabled;
  }, [disabled, digits, length]);

  const focusInput = (index: number) => {
    inputRefs.current[index]?.focus();
  };

  const handleChange = (index: number, inputValue: string) => {
    if (!inputValue || inputValue.length > 1) {
      return;
    }
    if (!/^\d$/.test(inputValue)) {
      return;
    }

    const targetIndex = digits[index] === "" ? index : getActiveIndex();
    if (targetIndex === -1 || digits.every((d) => d !== "")) {
      return;
    }

    const newDigits = [...digits];
    newDigits[targetIndex] = inputValue;

    while (newDigits.length < length) {
      newDigits.push("");
    }

    onChange(newDigits.slice(0, length));

    const nextEmpty = newDigits.indexOf("");
    if (nextEmpty !== -1) {
      focusInput(nextEmpty);
    } else if (targetIndex < length - 1) {
      focusInput(targetIndex + 1);
    }

    if (isComplete(newDigits, length) && onComplete) {
      onComplete(newDigits);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const newDigits = [...digits];

      if (newDigits[index] !== "") {
        newDigits[index] = "";
        onChange(newDigits.slice(0, length));
        setFocusedIndex(index);
      } else if (index > 0) {
        const prevFilled = newDigits
          .slice(0, index)
          .reduceRight(
            (found, d, i) => (found === -1 && d !== "" ? i : found),
            -1,
          );
        if (prevFilled !== -1) {
          newDigits[prevFilled] = "";
          onChange(newDigits.slice(0, length));
          focusInput(prevFilled);
        }
      }
    }
  };

  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    const pastedDigits = pastedData
      .replace(/\D/g, "")
      .slice(0, length)
      .split("");

    if (pastedDigits.length > 0) {
      while (pastedDigits.length < length) {
        pastedDigits.push("");
      }
      onChange(pastedDigits.slice(0, length));

      if (isComplete(pastedDigits, length) && onComplete) {
        onComplete(pastedDigits);
      } else {
        const nextEmpty = pastedDigits.findIndex((d) => !d);
        if (nextEmpty !== -1) {
          focusInput(nextEmpty);
        }
      }
    }
  };

  const handleFocus = (index: number) => {
    setFocusedIndex(index);
  };

  const handleBlur = () => {
    setFocusedIndex(null);
  };

  return (
    <div className={styles.otpContainer}>
      {Array.from({ length }, (_, index) => (
        <input
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length OTP input slots
          key={index}
          ref={(el) => {
            if (el) {
              inputRefs.current[index] = el;
            }
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[index] || ""}
          placeholder="0"
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(index)}
          onBlur={handleBlur}
          disabled={disabled}
          className={`${styles.otpInput}
          ${digits[index] ? styles.filled : ""}
          ${focusedIndex === index ? styles.focused : ""} 
          ${isError ? styles.error : ""}
          `}
        />
      ))}
    </div>
  );
};
