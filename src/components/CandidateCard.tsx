"use client";

import clsx from "clsx";
import { Check, User } from "lucide-react";
import type { Candidat } from "@/lib/types";

interface Props {
  candidat: Candidat;
  selected: boolean;
  onSelect: () => void;
}

export function CandidateCard({ candidat, selected, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={clsx(
        "group flex w-full items-center gap-4 rounded-card border-2 bg-white p-4 text-left shadow-soft transition-all duration-200 active:scale-[0.98]",
        selected
          ? "border-petrol-600 shadow-lift"
          : "border-transparent hover:border-petrol-200 hover:shadow-lift"
      )}
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-petrol-50">
        {candidat.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={candidat.photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <User className="h-7 w-7 text-petrol-400" />
        )}
      </div>

      <span className="flex-1 font-display text-lg font-semibold text-ink">{candidat.nom}</span>

      <span
        className={clsx(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          selected ? "border-petrol-600 bg-petrol-600" : "border-line bg-white"
        )}
      >
        {selected && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
      </span>
    </button>
  );
}
