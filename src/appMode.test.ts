import { describe, expect, it } from "vitest";
import { parseAppMode } from "./appMode";

describe("parseAppMode", () => {
  it("defaults to standard when no query string", () => {
    expect(parseAppMode("")).toEqual({ kind: "standard" });
  });

  it("defaults to standard when mode param is absent", () => {
    expect(parseAppMode("?foo=bar")).toEqual({ kind: "standard" });
  });

  it("defaults to standard for unknown mode value", () => {
    expect(parseAppMode("?mode=p2p")).toEqual({ kind: "standard" });
    expect(parseAppMode("?mode=")).toEqual({ kind: "standard" });
  });

  it("parses standard explicitly", () => {
    expect(parseAppMode("?mode=standard")).toEqual({ kind: "standard" });
  });

  it("parses demo", () => {
    expect(parseAppMode("?mode=demo")).toEqual({ kind: "demo" });
  });

  it("parses advanced", () => {
    expect(parseAppMode("?mode=advanced")).toEqual({ kind: "advanced" });
  });
});
