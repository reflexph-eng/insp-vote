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
        "relative flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 bg-white p-2 text-center shadow-soft transition-all duration-200 active:scale-[0.97] sm:gap-3 sm:rounded-card sm:p-4",
        selected
          ? "border-petrol-600 shadow-lift"
          : "border-transparent hover:border-petrol-200 hover:shadow-lift"
      )}
    >
      {selected && (
        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-petrol-600 sm:right-2 sm:top-2 sm:h-6 sm:w-6">
          <Check className="h-3 w-3 text-white sm:h-3.5 sm:w-3.5" strokeWidth={3} />
        </span>
      )}

      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-petrol-50 sm:h-16 sm:w-16">
        {candidat.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={candidat.photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <User className="h-5 w-5 text-petrol-400 sm:h-7 sm:w-7" />
        )}
      </div>

      <span className="line-clamp-2 font-display text-xs font-semibold leading-tight text-ink sm:text-lg">
        {candidat.nom}
      </span>
    </button>
  );
}
