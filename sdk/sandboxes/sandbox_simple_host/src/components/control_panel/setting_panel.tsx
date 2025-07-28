"use client";

import React from "react";

import { useKeplrEwallet } from "@keplr-ewallet-demo-web/contexts/KeplrEwalletProvider";

const ALL_LOGIN_METHODS = ["email", "sms", "google", "apple", "twitter"];

export const SettingPanel = () => {
  const { loginMethods, setLoginMethods } = useKeplrEwallet();

  const handleCheckboxChange = (method: string) => {
    setLoginMethods((prevMethods) => {
      if (prevMethods.includes(method as any)) {
        return prevMethods.filter((m) => m !== method);
      } else {
        return [...prevMethods, method as any];
      }
    });
  };

  return (
    <>
      <h3>Authentication</h3>
      {ALL_LOGIN_METHODS.map((method) => (
        <div key={method}>
          <input
            type="checkbox"
            id={method}
            name={method}
            checked={loginMethods.includes(method as any)}
            onChange={() => handleCheckboxChange(method)}
          />
          <label htmlFor={method}>
            {method.charAt(0).toUpperCase() + method.slice(1)}
          </label>
        </div>
      ))}
    </>
  );
};
