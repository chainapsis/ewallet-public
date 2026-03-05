"use client";

import React from "react";

type ButtonVariant = "primary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-700/60 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-white text-black hover:bg-gray-100 active:scale-[0.99]",
  ghost:
    "bg-transparent text-gray-200 border border-gray-700/60 hover:bg-gray-800/50",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-12 px-6 text-base",
  lg: "h-14 px-8 text-lg",
};

export default function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  loading = false,
  className = "",
  ...props
}: ButtonProps) {
  const widthClass = fullWidth ? "w-full" : "";
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
      aria-busy={loading}
      aria-disabled={props.disabled || loading}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden
          className="inline-block h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin"
        />
      ) : (
        props.children
      )}
    </button>
  );
}
