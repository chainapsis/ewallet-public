"use client";

import {
  type FC,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";

type ExpiryTimerProps = {
  expiresAt?: string;
  duration?: number;
  children: (props: {
    timeDisplay: string;
    isExpired: boolean;
    resetTimer: (newExpiresAt: string) => void;
  }) => ReactNode;
};

function calcSecondsLeft(expiresAt: string): number {
  return Math.max(
    0,
    Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
  );
}

export const ExpiryTimer: FC<ExpiryTimerProps> = ({
  expiresAt,
  duration = 0,
  children,
}) => {
  const [secondLeft, setSecondLeft] = useState(() =>
    expiresAt ? calcSecondsLeft(expiresAt) : duration,
  );

  useEffect(() => {
    if (expiresAt) {
      setSecondLeft(calcSecondsLeft(expiresAt));
    }
  }, [expiresAt]);

  const resetTimer = useCallback((newExpiresAt: string) => {
    setSecondLeft(calcSecondsLeft(newExpiresAt));
  }, []);

  useEffect(() => {
    if (secondLeft <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setSecondLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [secondLeft]);

  return (
    <>
      {children({
        timeDisplay: formatTime(secondLeft),
        isExpired: secondLeft <= 0,
        resetTimer,
      })}
    </>
  );
};

function formatTime(seconds: number): string {
  if (seconds <= 0) {
    return "00:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}
