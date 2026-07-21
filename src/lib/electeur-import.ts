import * as XLSX from "xlsx";
import { cleanMatricule, normalizeMatricule } from "@/lib/matricule";

export interface ParsedElecteur {
  matricule: string;
  matriculeNormalise: string;
  matriculeOriginal?: string;
  matriculeGenere: boolean;
  nom: string;
  prenom: string;
  ligne: number;
}

export interface ImportAnalysis {
  feuille: string;
  ligneEntete: number;
  lignesLues: number;
  valides: number;
  matriculesVides: number;
  nomsVides: number;
  doublons: number;
  matriculesGeneres: number;
  erreurs: string[];
}

export interface ParsedImport {
  electeurs: ParsedElecteur[];
  analysis: ImportAnalysis;
}

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/&/g, " ET ")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function splitNomPrenoms(fullName: string): { nom: string; prenom: string } {
  const cleaned = fullName.trim().replace(/\s+/g, " ");
  const tokens = cleaned.split(" ");
  if (tokens.length <= 1) return { nom: cleaned, prenom: "" };

  const isUpperToken = (token: string) => {
    const letters = token.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, "");
    return Boolean(letters) && letters === letters.toUpperCase();
  };

  let splitAt = 1;
  while (splitAt < tokens.length && isUpperToken(tokens[splitAt])) splitAt += 1;

  if (splitAt >= tokens.length) {
    return { nom: tokens[0], prenom: tokens.slice(1).join(" ") };
  }

  return {
    nom: tokens.slice(0, splitAt).join(" "),
    prenom: tokens.slice(splitAt).join(" "),
  };
}

export function parseElecteursWorkbook(buffer: Buffer): ParsedImport {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error("feuille_introuvable");

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });

  let headerIndex = -1;
  let matriculeColumn = -1;
  let fullNameColumn = -1;
  let nomColumn = -1;
  let prenomColumn = -1;

  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
    const headers = matrix[rowIndex].map(normalizeHeader);
    const matriculeIndex = headers.findIndex((header) => header === "MATRICULE");
    const fullNameIndex = headers.findIndex((header) =>
      ["NOM ET PRENOMS", "NOM PRENOMS", "NOMS ET PRENOMS"].includes(header)
    );
    const nomIndex = headers.findIndex((header) => ["NOM", "NOMS"].includes(header));
    const prenomIndex = headers.findIndex((header) => ["PRENOM", "PRENOMS"].includes(header));

    if (matriculeIndex >= 0 && (fullNameIndex >= 0 || (nomIndex >= 0 && prenomIndex >= 0))) {
      headerIndex = rowIndex;
      matriculeColumn = matriculeIndex;
      fullNameColumn = fullNameIndex;
      nomColumn = nomIndex;
      prenomColumn = prenomIndex;
      break;
    }
  }

  if (headerIndex < 0) throw new Error("colonnes_introuvables");

  const electeurs: ParsedElecteur[] = [];
  const seen = new Set<string>();
  const erreurs: string[] = [];
  let lignesLues = 0;
  let matriculesVides = 0;
  let nomsVides = 0;
  let doublons = 0;
  let matriculesGeneres = 0;

  type LigneSource = {
    rowIndex: number;
    matriculeOriginal: string;
    matriculeOriginalNormalise: string;
    nom: string;
    prenom: string;
  };

  const lignesSources: LigneSource[] = [];
  const occurrences = new Map<string, number>();

  for (let rowIndex = headerIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex];
    const hasAnyValue = row.some((value) => String(value ?? "").trim() !== "");
    if (!hasAnyValue) continue;
    lignesLues += 1;

    const matriculeOriginal = cleanMatricule(row[matriculeColumn]);
    const matriculeOriginalNormalise = normalizeMatricule(matriculeOriginal);
    if (!matriculeOriginalNormalise) {
      matriculesVides += 1;
      erreurs.push(`Ligne ${rowIndex + 1} : matricule vide.`);
      continue;
    }

    let nom = "";
    let prenom = "";
    if (fullNameColumn >= 0) {
      const fullName = String(row[fullNameColumn] ?? "").trim().replace(/\s+/g, " ");
      const split = splitNomPrenoms(fullName);
      nom = split.nom;
      prenom = split.prenom;
    } else {
      nom = String(row[nomColumn] ?? "").trim().replace(/\s+/g, " ");
      prenom = String(row[prenomColumn] ?? "").trim().replace(/\s+/g, " ");
    }

    if (!nom && !prenom) {
      nomsVides += 1;
      erreurs.push(`Ligne ${rowIndex + 1} : nom et prenoms vides.`);
      continue;
    }

    occurrences.set(
      matriculeOriginalNormalise,
      (occurrences.get(matriculeOriginalNormalise) ?? 0) + 1
    );
    lignesSources.push({ rowIndex, matriculeOriginal, matriculeOriginalNormalise, nom, prenom });
  }

  const numerosParBase = new Map<string, number>();

  for (const ligne of lignesSources) {
    const totalOccurrences = occurrences.get(ligne.matriculeOriginalNormalise) ?? 1;
    let matricule = ligne.matriculeOriginal;
    let matriculeNormalise = ligne.matriculeOriginalNormalise;
    let matriculeGenere = false;

    if (totalOccurrences > 1) {
      let numero = (numerosParBase.get(ligne.matriculeOriginalNormalise) ?? 0) + 1;
      let candidat = "";
      let candidatNormalise = "";

      do {
        candidat = `${ligne.matriculeOriginal}${String(numero).padStart(3, "0")}`;
        candidatNormalise = normalizeMatricule(candidat);
        numero += 1;
      } while (seen.has(candidatNormalise));

      numerosParBase.set(ligne.matriculeOriginalNormalise, numero - 1);
      matricule = candidat;
      matriculeNormalise = candidatNormalise;
      matriculeGenere = true;
      matriculesGeneres += 1;
    }

    if (seen.has(matriculeNormalise)) {
      doublons += 1;
      erreurs.push(`Ligne ${ligne.rowIndex + 1} : matricule en doublon (${matricule}).`);
      continue;
    }

    seen.add(matriculeNormalise);
    electeurs.push({
      matricule,
      matriculeNormalise,
      matriculeOriginal: matriculeGenere ? ligne.matriculeOriginal : undefined,
      matriculeGenere,
      nom: ligne.nom,
      prenom: ligne.prenom,
      ligne: ligne.rowIndex + 1,
    });
  }

  return {
    electeurs,
    analysis: {
      feuille: sheetName,
      ligneEntete: headerIndex + 1,
      lignesLues,
      valides: electeurs.length,
      matriculesVides,
      nomsVides,
      doublons,
      matriculesGeneres,
      erreurs: erreurs.slice(0, 20),
    },
  };
}
