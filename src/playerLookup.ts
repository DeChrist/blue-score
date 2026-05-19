import type { Pair, Player } from "./types";

export type PlayerNameLookup = (id: string) => string;

export function makePlayerNameLookup(players: Player[]): PlayerNameLookup {
  const byId = new Map(players.map((player) => [player.id, player.displayName]));
  return (id) => byId.get(id) ?? id;
}

export function formatPair(playerName: PlayerNameLookup, pair: Pair): string {
  return `${playerName(pair.player1Id)} / ${playerName(pair.player2Id)}`;
}
