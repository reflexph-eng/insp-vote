"use client";

import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: "primary" | "ghost" | "danger";
}

export function PrimaryButton({
  loading,
  variant = "primary",
  className,
  children,
  disabled,
  ...rest
}: Props) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        "inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-base font-semibold tracking-wide transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "bg-petrol-600 text-white shadow-soft hover:bg-petrol-700 active:scale-[0.98]",
        variant === "ghost" &&
          "border border-line bg-white text-ink hover:border-petrol-300 active:scale-[0.98]",
        variant === "danger" &&
          "bg-alert text-white shadow-soft hover:bg-alert/90 active:scale-[0.98]",
        className
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-5 w-5 animate-spin" />}
      {children}
    </button>
  );
}
