export type AppMode =
  | { kind: "demo" }
  | { kind: "standard" }
  | { kind: "advanced" };

export function parseAppMode(search: string): AppMode {
  const params = new URLSearchParams(search);
  switch (params.get("mode")) {
    case "demo": return { kind: "demo" };
    case "advanced": return { kind: "advanced" };
    default: return { kind: "standard" };
  }
}
