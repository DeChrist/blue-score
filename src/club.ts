import rawClubConfig from "./clubConfig.json";
import type { Club, Court, ValidationResult } from "./types";

const CLUB_NAME_MAX_LENGTH = 32;
const COURT_NAME_MAX_LENGTH = 32;
const MIN_COURTS = 2;
const MAX_COURTS = 6;

type UnknownRecord = Record<string, unknown>;

function fail(errors: string[]): ValidationResult {
  return { valid: errors.length === 0, errors };
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidWebsiteUrl(value: string): boolean {
  if (value === "") return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateClub(club: Club): ValidationResult {
  const errors: string[] = [];
  const name = club.name.trim();

  if (!name) errors.push("Club name is required.");
  if (name.length > CLUB_NAME_MAX_LENGTH) errors.push(`Club name cannot exceed ${CLUB_NAME_MAX_LENGTH} characters.`);
  if (!club.logoSvg.trim()) errors.push("Club logo SVG is required.");
  if (!club.logoSvg.trim().startsWith("<svg")) errors.push("Club logo must be an SVG string.");
  if (!Array.isArray(club.courts) || club.courts.length < MIN_COURTS || club.courts.length > MAX_COURTS) {
    errors.push(`Club courts must contain ${MIN_COURTS} through ${MAX_COURTS} courts.`);
  }
  if (!isValidWebsiteUrl(club.websiteUrl)) {
    errors.push("Club website URL must be empty or an absolute http(s) URL.");
  }

  club.courts.forEach((court, index) => {
    if (court.name.trim().length > COURT_NAME_MAX_LENGTH) {
      errors.push(`Club court ${index + 1} name cannot exceed ${COURT_NAME_MAX_LENGTH} characters.`);
    }
  });

  return fail(errors);
}

export function parseClubConfig(input: unknown): Club {
  if (!isRecord(input)) {
    throw new Error("Club config must be an object.");
  }

  const rawCourts = input.courts;
  const courts: Court[] = Array.isArray(rawCourts)
    ? rawCourts.map((court) => ({
      name: isRecord(court) && typeof court.name === "string" ? court.name : "",
    }))
    : [];

  const club: Club = {
    name: typeof input.name === "string" ? input.name.trim() : "",
    logoSvg: typeof input.logoSvg === "string" ? input.logoSvg : "",
    courts,
    websiteUrl: typeof input.websiteUrl === "string" ? input.websiteUrl.trim() : "",
  };

  const validation = validateClub(club);
  if (!validation.valid) {
    throw new Error(validation.errors.join("\n"));
  }

  return club;
}

export function formatAppTitle(club: Pick<Club, "name">): string {
  return `${club.name} - Padel Americano`;
}

export function formatCourtTitle(courtNumber: number, courts: readonly Court[]): string {
  const courtName = courts[courtNumber - 1]?.name.trim() ?? "";
  return courtName ? `Court ${courtNumber} - ${courtName}` : `Court ${courtNumber}`;
}

export const activeClub = parseClubConfig(rawClubConfig);
