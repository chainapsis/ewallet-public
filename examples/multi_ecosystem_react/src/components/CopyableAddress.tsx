import { useState } from "react";

export default function CopyableAddress({
  value,
  label = "Wallet Address",
}: {
  value?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!value) {
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }

  const formatted = value ? `${value.slice(0, 10)}...${value.slice(-8)}` : "-";

  return (
    <div className="flex flex-col gap-3">
      <label className="block text-xs font-semibold tracking-wide uppercase text-gray-300">
        {label}
      </label>
      <button
        type="button"
        onClick={copy}
        className="group flex items-center justify-between bg-widget-field border border-widget-border rounded-2xl px-6 py-5 font-mono text-sm hover:border-widget-border-hover transition-colors text-left"
      >
        <span className="truncate mr-4">{formatted}</span>
        <span className="relative flex items-center">
          <svg
            className={`h-5 w-5 transition-opacity ${
              copied ? "opacity-0" : "opacity-80 group-hover:opacity-100"
            }`}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 9.5C9 8.67157 9.67157 8 10.5 8H17.5C18.3284 8 19 8.67157 19 9.5V16.5C19 17.3284 18.3284 18 17.5 18H10.5C9.67157 18 9 17.3284 9 16.5V9.5Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M7 15.5H6.5C5.67157 15.5 5 14.8284 5 14V7C5 6.17157 5.67157 5.5 6.5 5.5H13.5C14.3284 5.5 15 6.17157 15 7V7.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <svg
            className={`absolute right-0 h-5 w-5 text-green-400 transition-opacity ${
              copied ? "opacity-100" : "opacity-0"
            }`}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M20 6L9 17L4 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
    </div>
  );
}
