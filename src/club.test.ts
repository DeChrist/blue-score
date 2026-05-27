import { describe, expect, it } from "vitest";
import { formatCourtTitle, parseClubConfig, validateClub } from "./club";
import type { Club } from "./types";

function validClub(patch: Partial<Club> = {}): Club {
  return {
    name: "Club",
    logoSvg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 32 32\"></svg>",
    courts: [{ name: "" }, { name: "" }, { name: "" }],
    websiteUrl: "",
    ...patch,
  };
}

describe("club config", () => {
  it("parses a valid placeholder club config", () => {
    const club = parseClubConfig(validClub());

    expect(club.name).toBe("Club");
    expect(club.websiteUrl).toBeUndefined();
    expect(club.courts).toHaveLength(3);
  });

  it("rejects empty and too-long club names", () => {
    expect(validateClub(validClub({ name: " " })).errors).toContain("Club name is required.");
    expect(validateClub(validClub({ name: "x".repeat(33) })).errors).toContain("Club name cannot exceed 32 characters.");
  });

  it("accepts empty and absolute http(s) website URLs", () => {
    expect(validateClub(validClub({ websiteUrl: "" })).valid).toBe(true);
    expect(validateClub(validClub({ websiteUrl: undefined })).valid).toBe(true);
    expect(validateClub(validClub({ websiteUrl: "https://example.com/club" })).valid).toBe(true);
    expect(validateClub(validClub({ websiteUrl: "http://example.com" })).valid).toBe(true);
  });

  it("rejects missing and non-SVG logos", () => {
    expect(validateClub(validClub({ logoSvg: "" })).errors).toContain("Club logo SVG is required.");
    expect(validateClub(validClub({ logoSvg: "not svg" })).errors).toContain("Club logo must be an SVG string.");
  });

  it("rejects invalid or non-web website URLs", () => {
    expect(validateClub(validClub({ websiteUrl: "not a url" })).errors).toContain("Club website URL must be empty or an absolute http(s) URL.");
    expect(validateClub(validClub({ websiteUrl: "ftp://example.com" })).errors).toContain("Club website URL must be empty or an absolute http(s) URL.");
  });

  it("rejects more than six courts", () => {
    const courts = Array.from({ length: 7 }, () => ({ name: "" }));

    expect(validateClub(validClub({ courts })).errors).toContain("Club courts must contain 2 through 6 courts.");
  });

  it("rejects court names over 32 characters", () => {
    expect(validateClub(validClub({ courts: [{ name: "x".repeat(33) }, { name: "" }] })).errors).toContain(
      "Club court 1 name cannot exceed 32 characters.",
    );
  });
});

describe("formatCourtTitle", () => {
  it("does not add a trailing separator when the court name is empty", () => {
    expect(formatCourtTitle(2, [{ name: "" }, { name: "" }])).toBe("Court 2");
  });

  it("adds the configured court name when present", () => {
    expect(formatCourtTitle(2, [{ name: "" }, { name: "Center" }])).toBe("Court 2 - Center");
  });
});
