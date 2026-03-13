"use client";

import { type FC, useLayoutEffect, useState } from "react";

export const ToggleColorScheme: FC = () => {
  const [colorScheme, setColorScheme] = useState<"light" | "dark">("light");

  useLayoutEffect(() => {
    document.documentElement.style.colorScheme = colorScheme;
  }, [colorScheme]);

  const toggleColorScheme = () => {
    setColorScheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <div style={{ marginBottom: "20px" }}>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          cursor: "pointer",
        }}
      >
        <span>Color Scheme:</span>
        <div
          style={{
            position: "relative",
            width: "60px",
            height: "30px",
            backgroundColor: colorScheme === "dark" ? "#333" : "#ccc",
            borderRadius: "15px",
            transition: "background-color 0.3s",
          }}
          onClick={toggleColorScheme}
        >
          <div
            style={{
              position: "absolute",
              top: "3px",
              left: colorScheme === "dark" ? "33px" : "3px",
              width: "24px",
              height: "24px",
              backgroundColor: "white",
              borderRadius: "50%",
              transition: "left 0.3s",
            }}
          />
        </div>
        <span>{colorScheme === "light" ? "🌞 Light" : "🌙 Dark"}</span>
      </label>
    </div>
  );
};
