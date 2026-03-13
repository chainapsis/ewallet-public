"use client";

const ALL_LOGIN_METHODS = ["email", "sms", "google", "apple", "twitter"];

export const SettingPanel = () => {
  const handleCheckboxChange = (_method: string) => {};

  return (
    <>
      <h3>Authentication</h3>
      {ALL_LOGIN_METHODS.map((method) => (
        <div key={method}>
          <input
            type="checkbox"
            id={method}
            name={method}
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
