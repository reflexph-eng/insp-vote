"use client";

import { AlertTriangle } from "lucide-react";
import { PrimaryButton } from "./PrimaryButton";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 backdrop-blur-sm sm:items-center"
    >
      <div className="w-full max-w-sm animate-fade-up rounded-card bg-white p-6 shadow-lift">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold-50">
          <AlertTriangle className="h-6 w-6 text-gold-400" />
        </div>
        <h2 className="text-center font-display text-xl font-semibold text-ink">{title}</h2>
        <p className="mt-2 text-center text-sm text-ink/60">{description}</p>

        <div className="mt-6 flex flex-col gap-2">
          <PrimaryButton onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </PrimaryButton>
          <PrimaryButton variant="ghost" onClick={onCancel} disabled={loading}>
            Annuler
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
