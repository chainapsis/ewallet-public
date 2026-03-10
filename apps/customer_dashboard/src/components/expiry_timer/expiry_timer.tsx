"use client";

import { type FC, type ReactNode, useCallback, useEffect, useState } from "react";

type ExpiryTimerProps = {
  duration: number;
  children: (props: {
    timeDisplay: string;
    isExpired: boolean;
    resetTimer: () => void;
  }) => ReactNode;
};

export const ExpiryTimer: FC<ExpiryTimerProps> = ({
  duration,
  children,
}) => {
  const [secondLeft, setSecondLeft] = useState(duration);

  const resetTimer = useCallback(() => {
    setSecondLeft(duration);
  }, [duration]);

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
