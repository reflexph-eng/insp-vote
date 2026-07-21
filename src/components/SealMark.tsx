import { Check } from "lucide-react";

/**
 * Element signature de l'identite visuelle INSP VOTE : un sceau institutionnel
 * qui s'anime a l'enregistrement du vote, evoquant le cachet officiel d'un
 * bureau de vote plutot qu'une simple coche de succes generique.
 */
export function SealMark() {
  return (
    <div className="relative mx-auto h-28 w-28 animate-seal-in">
      <div className="absolute inset-0 rounded-full border-4 border-petrol-600" />
      <div className="absolute inset-[10px] rounded-full border-2 border-gold-400" />
      <div className="absolute inset-[10px] rounded-full border-[3px] border-dashed border-gold-300/60" />
      <div className="absolute inset-3 flex items-center justify-center rounded-full bg-petrol-600">
        <Check className="h-10 w-10 text-gold-100" strokeWidth={3} />
      </div>
    </div>
  );
}
